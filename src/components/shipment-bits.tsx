import { Anchor, CircleCheck, Ship, Truck } from "lucide-react";
import { COUNTRY_NAMES, operatorById, siteById } from "@/data/reference";
import { formatDateTime, formatDay } from "@/domain/format";
import type { EtaView, Mode, Severity, ShipmentSnapshot, ShipmentStatus } from "@/domain/types";
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
    <span className="inline-flex items-center gap-1 text-neutral-500">
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
/** What the confidence level means, shown on hover wherever an estimate appears. */
export const CONFIDENCE_HINT =
  "No operator has confirmed a date yet, so this is an estimate. Confidence says how far the real date may move: high, up to a day; low, up to four days, when the feed has gone quiet, a status was not recognised or the shipment is held.";

export function EtaBadge({ eta, compact = false }: { eta: EtaView; compact?: boolean }) {
  if (eta.deliveredAt) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
        <CircleCheck className="size-4" aria-hidden /> {formatDay(eta.deliveredAt)}
      </span>
    );
  }
  if (eta.confirmed) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-medium text-neutral-900">{formatDay(eta.confirmed.date)}</span>
        <Badge tone="ok">Confirmed{compact ? "" : ` by ${operatorById(eta.confirmed.operatorId).name}`}</Badge>
        {eta.delayDays > 0 && <span className="text-xs font-medium text-orange-700">+{eta.delayDays}d</span>}
      </span>
    );
  }
  if (!eta.estimate) return <span className="text-sm text-neutral-400">—</span>;
  const { date, earliest, latest, confidence } = eta.estimate;
  const range = formatDay(earliest) === formatDay(latest) ? formatDay(date) : `${formatDay(earliest)} – ${formatDay(latest)}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-medium italic text-neutral-700">~{formatDay(date)}</span>
      <Badge tone={confidence === "low" ? "medium" : "neutral"} className="border-dashed" title={CONFIDENCE_HINT}>
        Estimate · {confidence} confidence
      </Badge>
      {eta.delayDays > 0 && <span className="text-xs font-medium text-orange-700">+{eta.delayDays}d</span>}
      {!compact && <span className="text-xs text-neutral-500">range {range}</span>}
    </span>
  );
}

export function LastUpdate({ s }: { s: ShipmentSnapshot }) {
  return <span className="text-xs text-neutral-500">{s.lastUpdate ? formatDateTime(s.lastUpdate) : "No updates yet"}</span>;
}
