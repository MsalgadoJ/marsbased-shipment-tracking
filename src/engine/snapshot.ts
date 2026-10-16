import { normalise, type Normalised } from "@/adapters";
import type { RawEvent } from "@/data/raw-events";
import type { Shipment, ShipmentSnapshot } from "@/domain/types";
import { consolidate, currentLegIndex, deriveStatus } from "./consolidate";
import { computeEta, lastUpdateAt } from "./eta";
import { detectExceptions, SEVERITY_RANK } from "./risk";

/**
 * The read model: raw events up to `now` → normalised → consolidated → ETA → exceptions.
 * Re-running it with a later clock is how the prototype simulates live updates.
 */
export function buildSnapshots(shipments: Shipment[], rawEvents: RawEvent[], now: string): ShipmentSnapshot[] {
  const normalised = rawEvents.map(normalise).filter((e) => e.at <= now);
  const byRef = new Map<string, Normalised[]>();
  for (const e of normalised) {
    const key = `${e.operatorId}:${e.ref}`;
    byRef.set(key, [...(byRef.get(key) ?? []), e]);
  }

  return shipments.map((shipment) => {
    const events = shipment.legs.flatMap((l) => byRef.get(`${l.operatorId}:${l.operatorRef}`) ?? []);
    const { milestones, unmapped } = consolidate(shipment, events);
    const eta = computeEta(shipment, milestones, unmapped, now);
    const idx = currentLegIndex(shipment, milestones);
    return {
      shipment,
      milestones,
      unmapped,
      status: deriveStatus(shipment, milestones),
      currentLegId: shipment.legs[idx]?.id,
      lastUpdate: lastUpdateAt(milestones, unmapped),
      eta,
      exceptions: detectExceptions(shipment, milestones, unmapped, eta, now),
    };
  });
}

/** Most urgent first: worst severity, then number of exceptions, then delay. */
export function byUrgency(a: ShipmentSnapshot, b: ShipmentSnapshot): number {
  const worst = (s: ShipmentSnapshot) => Math.min(3, ...s.exceptions.map((e) => SEVERITY_RANK[e.severity]));
  return worst(a) - worst(b) || b.exceptions.length - a.exceptions.length || b.eta.delayDays - a.eta.delayDays;
}
