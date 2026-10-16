import type { Normalised } from "@/adapters";
import { hoursBetween } from "@/domain/dates";
import type { Milestone, Shipment, ShipmentStatus, UnmappedEvent } from "@/domain/types";
import type { MilestoneCode } from "@/domain/vocabulary";

/**
 * Merges normalised events from every operator involved in a shipment into one timeline.
 *
 * Operators describe their own leg, not the whole journey: a trucker's "delivered" at the port is a
 * handover, not the customer's delivery. Consolidation reads each event in the context of its leg.
 */
export function consolidate(
  shipment: Shipment,
  events: Normalised[],
): { milestones: Milestone[]; unmapped: UnmappedEvent[] } {
  const legByRef = new Map(shipment.legs.map((l, i) => [`${l.operatorId}:${l.operatorRef}`, { leg: l, index: i }]));
  const lastIndex = shipment.legs.length - 1;
  const milestones: Milestone[] = [];
  const unmapped: UnmappedEvent[] = [];

  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    const match = legByRef.get(`${e.operatorId}:${e.ref}`);
    if (!match) continue;
    const { leg, index } = match;

    if (!e.ok) {
      unmapped.push({ legId: leg.id, at: e.at, operatorId: e.operatorId, rawId: e.rawId, rawSummary: e.rawSummary, reason: e.reason });
      continue;
    }

    let code: MilestoneCode = e.code;
    let detail = e.detail;
    let completesLeg = false;
    if (index < lastIndex) {
      const next = shipment.legs[index + 1];
      if (code === "delivered") {
        code = next.mode === "sea" ? "gate_in_port" : "arrived_hub";
        detail = `Handed over to ${next.mode === "sea" ? "the ocean carrier" : "the next carrier"}`;
        completesLeg = true;
      } else if (code === "out_for_delivery") {
        code = "in_transit";
      } else if (leg.mode === "sea" && code === "discharged") {
        completesLeg = true;
      }
    } else if (code === "delivered") {
      completesLeg = true;
    }

    const milestone: Milestone = {
      code,
      at: e.at,
      legId: leg.id,
      location: e.location,
      operatorEta: e.operatorEta,
      detail,
      completesLeg,
      source: {
        operatorId: e.operatorId,
        rawId: e.rawId,
        rawSummary: e.rawSummary,
        parsedBy: e.parsedBy,
        confidence: e.confidence,
      },
    };

    // Two parties confirming the same step within a day is one milestone with two sources.
    const prev = milestones.at(-1);
    if (prev && prev.code === code && prev.source.operatorId !== e.operatorId && hoursBetween(prev.at, e.at) < 24) {
      prev.alsoReportedBy = [...(prev.alsoReportedBy ?? []), { operatorId: e.operatorId, rawSummary: e.rawSummary }];
      continue;
    }
    milestones.push(milestone);
  }

  return { milestones, unmapped };
}

/** Index of the first leg that has not been completed; equals legs.length once delivered. */
export function currentLegIndex(shipment: Shipment, milestones: Milestone[]): number {
  const done = new Set(milestones.filter((m) => m.completesLeg).map((m) => m.legId));
  const idx = shipment.legs.findIndex((l) => !done.has(l.id));
  return idx === -1 ? shipment.legs.length : idx;
}

const CUSTOMS: MilestoneCode[] = ["customs_submitted", "customs_hold"];

export function deriveStatus(shipment: Shipment, milestones: Milestone[]): ShipmentStatus {
  const last = milestones.at(-1);
  if (!last) return "planned";
  if (currentLegIndex(shipment, milestones) === shipment.legs.length) return "delivered";
  if (CUSTOMS.includes(last.code)) return "in_customs";
  if (last.code === "out_for_delivery" || last.code === "delivery_failed") return "out_for_delivery";
  if (["gate_in_port", "loaded_on_vessel", "vessel_arrived", "discharged"].includes(last.code)) return "at_port";
  return "in_transit";
}

/** Customs is on hold if the latest customs milestone is a hold. */
export function activeCustomsHold(milestones: Milestone[]): Milestone | undefined {
  const lastCustoms = milestones.filter((m) => m.code.startsWith("customs_")).at(-1);
  return lastCustoms?.code === "customs_hold" ? lastCustoms : undefined;
}
