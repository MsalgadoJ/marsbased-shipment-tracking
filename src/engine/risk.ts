import { operatorById } from "@/data/reference";
import { dayDiff, hoursBetween } from "@/domain/dates";
import type { DocumentKind, EtaView, Milestone, Severity, Shipment, ShipmentException, UnmappedEvent } from "@/domain/types";
import { activeCustomsHold } from "./consolidate";
import { isStale, lastUpdateAt, reportingOperator } from "./eta";

/**
 * Exception rules. Deterministic on purpose: what counts as an exception must be predictable and auditable.
 * The AI layer explains these and proposes what to do; it does not decide what is an exception.
 */

export const CUSTOMS_DOCUMENTS: DocumentKind[] = ["customs_declaration", "certificate_of_origin"];

export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };

export function detectExceptions(
  shipment: Shipment,
  milestones: Milestone[],
  unmapped: UnmappedEvent[],
  eta: EtaView,
  now: string,
): ShipmentException[] {
  if (eta.deliveredAt) return [];
  const out: ShipmentException[] = [];
  const last = milestones.at(-1);

  const hold = activeCustomsHold(milestones);
  if (hold) {
    out.push({
      type: "customs_hold",
      severity: "critical",
      cause: `Held by customs at ${hold.location || "destination"}${hold.detail ? `: “${hold.detail}”` : ""}`,
      since: hold.at,
    });
  }

  if (last?.code === "delivery_failed") {
    out.push({
      type: "delivery_failed",
      severity: "high",
      cause: `Delivery attempt failed in ${last.location}${last.detail ? ` (${last.detail.toLowerCase()})` : ""}`,
      since: last.at,
    });
  }

  if (eta.delayDays >= 1) {
    // A late date the operator has confirmed is a delay; one we only estimate is a risk.
    out.push({
      type: eta.confirmed ? "delayed" : "delay_risk",
      severity: eta.delayDays >= 3 ? "high" : "medium",
      cause: `${eta.delayDays} day${eta.delayDays > 1 ? "s" : ""} late against the planned delivery (${eta.confirmed ? `confirmed by ${operatorById(eta.confirmed.operatorId).name}` : "estimated"})`,
      since: now,
    });
  } else if (eta.estimate?.confidence === "low" && dayDiff(shipment.plannedDelivery, eta.estimate.latest) >= 1) {
    const days = dayDiff(shipment.plannedDelivery, eta.estimate.latest);
    out.push({
      type: "delay_risk",
      severity: "medium",
      cause: `Could arrive up to ${days} day${days > 1 ? "s" : ""} late; the current date is not reliable`,
      since: now,
    });
  }

  if (isStale(shipment, milestones, unmapped, now)) {
    const op = reportingOperator(shipment, milestones);
    const lastUpdate = lastUpdateAt(milestones, unmapped)!;
    const hours = Math.round(hoursBetween(lastUpdate, now));
    out.push({
      type: "stale",
      severity: hours > op.expectedUpdateHours * 2 ? "high" : "medium",
      cause: `No update from ${op.name} for ${hours} h; they normally report every ${op.expectedUpdateHours} h`,
      since: lastUpdate,
    });
  }

  if (shipment.customsRequired) {
    const have = new Set(shipment.documents.map((d) => d.kind));
    const missing = CUSTOMS_DOCUMENTS.filter((k) => !have.has(k));
    if (missing.length > 0) {
      out.push({
        type: "missing_document",
        severity: hold ? "high" : "medium",
        cause: `Missing for customs: ${missing.map((k) => k.replaceAll("_", " ")).join(", ")}`,
        since: shipment.legs[0].plannedDeparture,
      });
    }
  }

  for (const u of unmapped) {
    out.push({ type: "unmapped_event", severity: "medium", cause: `${u.reason}: ${u.rawSummary}`, since: u.at });
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
