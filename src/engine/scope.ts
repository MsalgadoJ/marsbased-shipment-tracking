import type { Persona } from "@/data/personas";
import { siteById } from "@/data/reference";
import type { ShipmentSnapshot } from "@/domain/types";

/** The persona's perimeter. The only place where visibility is decided. */
export function scopeSnapshots(snapshots: ShipmentSnapshot[], persona: Persona): ShipmentSnapshot[] {
  return persona.kind === "ops"
    ? snapshots.filter((s) => persona.siteIds.includes(s.shipment.originSiteId))
    : snapshots.filter((s) => s.shipment.customerId === persona.customerId);
}

/**
 * Answer for a reference or order number outside an operations persona's perimeter. The same
 * words whether it belongs to another site or does not exist, so the search cannot be used to
 * discover other sites' shipments (the detail page answers the same way).
 */
export function explainLookupMiss(
  lookup: { reference?: string; orderNumber?: string },
  persona: Extract<Persona, { kind: "ops" }>,
): string {
  const asked = lookup.reference ?? `Order ${lookup.orderNumber}`;
  const yours = persona.siteIds.map((id) => siteById(id).name).join(" and ");
  return `${asked} is not in your sites (${yours}).`;
}
