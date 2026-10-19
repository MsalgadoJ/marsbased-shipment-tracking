import type { Persona } from "@/data/personas";
import type { ShipmentSnapshot } from "@/domain/types";

/** The persona's perimeter. The only place where visibility is decided. */
export function scopeSnapshots(snapshots: ShipmentSnapshot[], persona: Persona): ShipmentSnapshot[] {
  return persona.kind === "ops"
    ? snapshots.filter((s) => persona.siteIds.includes(s.shipment.originSiteId))
    : snapshots.filter((s) => s.shipment.customerId === persona.customerId);
}
