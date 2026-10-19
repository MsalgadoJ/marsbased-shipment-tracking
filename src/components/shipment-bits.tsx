import { Anchor, CircleCheck, Ship, Truck } from "lucide-react";
import { COUNTRY_NAMES, operatorById, siteById } from "@/data/reference";
import { formatDateTime, formatDay } from "@/domain/format";
import type { Confidence, EtaView, Mode, Severity, ShipmentSnapshot, ShipmentStatus } from "@/domain/types";
import { Hint } from "./hint";
import { Badge, type Tone } from "./ui";

export const SEVERITY_TONE: Record<Severity, Tone> = { critical: "critical", high: "high", medium: "medium" };

const STATUS: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  planned: { label: "Planned", tone: "neutral" },
  in_transit: { label: "In transit", tone: "info" },
  at_port: { label: "At port", tone: "info" },
  in_customs: { label: "In customs", tone: "medium" },
  out_for_delivery: { label: "Out for delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "ok" },
};

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}

export function ModeIcon({ mode, className = "size-4" }: { mode: Mode; className?: string }) {
  return mode === "sea" ? <Ship className={className} aria-label="Sea" /> : <Truck className={className} aria-label="Road" />;
}

export function Modes({ s }: { s: ShipmentSnapshot }) {
  const modes = s.shipment.legs.map((l) => l.mode);
  return (
    <span className="inline-flex items-center gap-1 text-slate-500">
      {modes.map((m, i) => (
        <ModeIcon key={i} mode={m} className="size-3.5" />
      ))}
      {s.shipment.customsRequired && <Anchor className="size-3.5" aria-label="Customs" />}
    </span>
  );
}

export function Route({ s }: { s: ShipmentSnapshot }) {
  const site = siteById(s.shipment.originSiteId);
  return (
    <span>
      {site.city} → {s.shipment.destination.name}, {COUNTRY_NAMES[s.shipment.destination.country]}
    </span>
  );
}

/**
 * Confirmed and estimated dates never look the same: a confirmed date is a fact with a source,
 * an estimate is a range with a confidence.
 */
/** What each confidence level means for operations: its cause and how far the date may move (`RANGE` in the ETA engine). */
const CONFIDENCE: Record<Confidence, { cause: string; range: string }> = {
  high: { cause: "the operator of the current leg has given an arrival time", range: "should hold within a day" },
  medium: { cause: "it is worked out from the plan, as no operator has given a time for the current leg", range: "may move about a day, up to two at sea" },
  low: { cause: "the feed has gone quiet, a status was not recognised or the shipment is held", range: "may move up to a day by road and up to four days at sea" },
};

const capital = (c: Confidence) => c[0].toUpperCase() + c.slice(1);

/** Short line for the detail panel, where the specific reasons are listed right below. */
export const confidenceRange = (c: Confidence) => `${capital(c)} confidence: the date ${CONFIDENCE[c].range}.`;

/** Full explanation for the hover hint, where no reasons are shown. */
export const confidenceHint = (c: Confidence) => `${capital(c)} confidence: ${CONFIDENCE[c].cause}, so the date ${CONFIDENCE[c].range}.`;

/** Customer wording: how much the date may move, without internal signals (quiet feeds, unrecognised codes). */
export const CUSTOMER_CONFIDENCE_HINT: Record<Confidence, string> = {
  high: "High confidence: this date should hold within a day.",
  medium: "Medium confidence: this date may move by about a day. We will tell you as soon as the carrier confirms it.",
  low: "Low confidence: this date may move by a few days. We will tell you as soon as we know more.",
};

/**
 * An operator's date that our own estimate doubts: it falls on another day, or the estimate is not
 * high confidence (a quiet feed, an unread status, a hold). Operations see it flagged; the date
 * itself stays the operator's.
 */
export function confirmationInDoubt({ confirmed, estimate }: EtaView): boolean {
  if (!confirmed || !estimate) return false;
  return formatDay(confirmed.date) !== formatDay(estimate.date) || estimate.confidence !== "high";
}

export function EtaBadge({
  eta,
  compact = false,
  audience = "ops",
}: {
  eta: EtaView;
  compact?: boolean;
  audience?: "ops" | "customer";
}) {
  if (eta.deliveredAt) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <CircleCheck className="size-4" aria-hidden /> {formatDay(eta.deliveredAt)}
      </span>
    );
  }
  if (eta.confirmed) {
    const label = `Confirmed${compact ? "" : ` by ${operatorById(eta.confirmed.operatorId).name}`}`;
    const doubt = audience === "ops" && confirmationInDoubt(eta);
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-medium text-slate-900">{formatDay(eta.confirmed.date)}</span>
        {doubt && eta.estimate ? (
          <Hint
            text={`The operator confirmed this date, but the latest signals put it in doubt: it could be as late as ${formatDay(eta.estimate.latest)}. Open the shipment to see why.`}
          >
            <Badge tone="medium">{label} · may slip</Badge>
          </Hint>
        ) : (
          <Badge tone="ok">{label}</Badge>
        )}
        {eta.delayDays > 0 && <span className="text-xs font-medium text-orange-700">+{eta.delayDays}d</span>}
      </span>
    );
  }
  if (!eta.estimate) return <span className="text-sm text-slate-400">—</span>;
  const { date, earliest, latest, confidence } = eta.estimate;
  const range = formatDay(earliest) === formatDay(latest) ? formatDay(date) : `${formatDay(earliest)} – ${formatDay(latest)}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-medium italic text-slate-700">~{formatDay(date)}</span>
      <Hint text={`Estimate, not yet confirmed by the carrier. ${audience === "ops" ? confidenceHint(confidence) : CUSTOMER_CONFIDENCE_HINT[confidence]}`}>
        <Badge tone={confidence === "low" ? "medium" : "neutral"} className="border-dashed">
          Estimate · {confidence} confidence
        </Badge>
      </Hint>
      {eta.delayDays > 0 && <span className="text-xs font-medium text-orange-700">+{eta.delayDays}d</span>}
      {!compact && <span className="text-xs text-slate-500">range {range}</span>}
    </span>
  );
}

export function LastUpdate({ s }: { s: ShipmentSnapshot }) {
  return <span className="text-xs text-slate-500">{s.lastUpdate ? formatDateTime(s.lastUpdate) : "No updates yet"}</span>;
}
