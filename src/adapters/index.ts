import type { EuroRouteEvent, LevanteEvent, MareterraEvent, NordiaEmail, RapidoEvent, RawEvent } from "@/data/raw-events";
import { dateOnlyToIso, HOUR, madridOffset } from "@/domain/dates";
import type { MilestoneCode } from "@/domain/vocabulary";
import { parseOperatorEmail } from "@/ai/email-parser";

/**
 * One adapter per operator: raw event → canonical milestone, or an explicit "unmapped" result.
 * Adapters never guess. An unknown code is reported, not approximated.
 */

interface Base {
  operatorId: string;
  /** Operator reference used to find the leg (tracking number, B/L, file number). */
  ref: string;
  at: string;
  rawId: string;
  rawSummary: string;
}

export type Normalised =
  | (Base & {
      ok: true;
      code: MilestoneCode;
      location: string;
      operatorEta?: string;
      detail?: string;
      parsedBy: "rule" | "ai";
      confidence: number;
    })
  | (Base & { ok: false; reason: string });

/** Below this, an AI extraction is not trusted enough for the timeline. */
export const AI_CONFIDENCE_THRESHOLD = 0.7;

const LEVANTE: Record<string, MilestoneCode> = {
  RCG: "picked_up",
  TRN: "in_transit",
  PLT: "arrived_hub",
  REP: "out_for_delivery",
  ENT: "delivered",
  AUS: "delivery_failed",
};

const LEVANTE_LABEL: Record<string, string> = {
  RCG: "recogido",
  TRN: "en tránsito",
  PLT: "en plataforma",
  REP: "en reparto",
  ENT: "entregado",
  AUS: "destinatario ausente",
};

export function fromLevante(e: LevanteEvent): Normalised {
  const base = {
    operatorId: "TLV",
    ref: e.ref,
    at: e.ts,
    rawId: e.id,
    rawSummary: `codigo=${e.codigo} (${LEVANTE_LABEL[e.codigo] ?? "?"}) · ${e.poblacion}`,
  };
  const code = LEVANTE[e.codigo];
  if (!code) return { ...base, ok: false, reason: `Unknown Transportes Levante code "${e.codigo}"` };
  return {
    ...base,
    ok: true,
    code,
    location: e.poblacion,
    operatorEta: e.fecha_prevista ? dateOnlyToIso(e.fecha_prevista) : undefined,
    parsedBy: "rule",
    confidence: 1,
  };
}

const EUROROUTE: Record<string, MilestoneCode> = {
  collected: "picked_up",
  "on the road": "in_transit",
  "at cross-dock": "arrived_hub",
  "out for delivery": "out_for_delivery",
  delivered: "delivered",
  "delivery attempt failed": "delivery_failed",
};

/** "DD/MM/YYYY HH:mm" in Madrid local time → ISO UTC. */
function parseEuroTime(s: string): string {
  const [, dd, mm, yyyy, hh, min] = s.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)!;
  const asUtc = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min);
  return new Date(asUtc - madridOffset(asUtc) * HOUR).toISOString();
}

export function fromEuroRoute(e: EuroRouteEvent): Normalised {
  const base = {
    operatorId: "EUR",
    ref: e.consignment,
    at: parseEuroTime(e.time),
    rawId: e.id,
    rawSummary: `"${e.status}" · ${e.place} · ${e.time}${e.eta ? ` · ETA ${e.eta}` : ""}`,
  };
  const code = EUROROUTE[e.status.trim().toLowerCase()];
  if (!code) return { ...base, ok: false, reason: `Unknown EuroRoute status "${e.status}"` };
  const eta = e.eta?.split("/").reverse().join("-");
  return {
    ...base,
    ok: true,
    code,
    location: e.place,
    operatorEta: eta ? dateOnlyToIso(eta) : undefined,
    parsedBy: "rule",
    confidence: 1,
  };
}

const MARETERRA: Record<string, MilestoneCode> = {
  GTIN: "gate_in_port",
  LOAD: "loaded_on_vessel",
  DEPA: "vessel_departed",
  ARRI: "vessel_arrived",
  DISC: "discharged",
  GTOT: "in_transit",
  ETAU: "in_transit",
};

const PORTS: Record<string, string> = {
  ESVLC: "Valencia",
  GBSOU: "Southampton",
  USHOU: "Houston",
  PTSIE: "Sines",
};

const parseEdi = (s: string) =>
  new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10) || 0, +s.slice(10, 12) || 0)).toISOString();

export function fromMareterra(e: MareterraEvent): Normalised {
  const base = {
    operatorId: "MTL",
    ref: e.bl,
    at: parseEdi(e.dateTime),
    rawId: e.id,
    rawSummary: `STS+${e.statusCode} LOC+${e.locode} DTM+${e.dateTime}${e.eta ? ` ETA+${e.eta}` : ""}`,
  };
  const code = MARETERRA[e.statusCode];
  if (!code) return { ...base, ok: false, reason: `Unknown Mareterra Line status code "${e.statusCode}"` };
  const eta = e.eta ? `${e.eta.slice(0, 4)}-${e.eta.slice(4, 6)}-${e.eta.slice(6, 8)}` : undefined;
  return {
    ...base,
    ok: true,
    code,
    location: PORTS[e.locode] ?? e.locode,
    operatorEta: eta ? dateOnlyToIso(eta) : undefined,
    detail: e.statusCode === "ETAU" ? "Carrier revised the arrival date" : undefined,
    parsedBy: "rule",
    confidence: 1,
  };
}

export function fromNordia(e: NordiaEmail): Normalised {
  const x = parseOperatorEmail(e.subject, e.body);
  const base = {
    operatorId: "NFP",
    ref: x.fileRef ?? "",
    at: e.receivedAt,
    rawId: e.id,
    rawSummary: `Email "${e.subject}"`,
  };
  if (!x.code || x.confidence < AI_CONFIDENCE_THRESHOLD) {
    return { ...base, ok: false, reason: `Email could not be read with enough confidence (${Math.round(x.confidence * 100)}%)` };
  }
  return {
    ...base,
    ok: true,
    code: x.code,
    location: x.location ?? "",
    operatorEta: x.eta ? dateOnlyToIso(x.eta) : undefined,
    detail: x.evidence,
    parsedBy: "ai",
    confidence: x.confidence,
  };
}

const RAPIDO: Record<RapidoEvent["status"], MilestoneCode> = {
  IN_DEPOT: "arrived_hub",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  ATTEMPT_FAILED: "delivery_failed",
};

export function fromRapido(e: RapidoEvent): Normalised {
  return {
    operatorId: "RLM",
    ref: e.trackingNumber,
    at: e.datetime,
    rawId: e.id,
    rawSummary: `status=${e.status} · ${e.city}${e.estimatedDelivery ? ` · estimatedDelivery=${e.estimatedDelivery}` : ""}`,
    ok: true,
    code: RAPIDO[e.status],
    location: e.city,
    operatorEta: e.estimatedDelivery ? dateOnlyToIso(e.estimatedDelivery) : undefined,
    detail: e.status === "ATTEMPT_FAILED" ? "Recipient absent" : undefined,
    parsedBy: "rule",
    confidence: 1,
  };
}

export function normalise(e: RawEvent): Normalised {
  switch (e.kind) {
    case "levante":
      return fromLevante(e);
    case "euroroute":
      return fromEuroRoute(e);
    case "edi":
      return fromMareterra(e);
    case "email":
      return fromNordia(e);
    case "courier_api":
      return fromRapido(e);
  }
}
