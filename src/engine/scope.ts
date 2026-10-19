import { PERSONAS, type Persona } from "@/data/personas";
import { siteById } from "@/data/reference";
import type { Shipment, ShipmentSnapshot } from "@/domain/types";

/** The persona's perimeter. The only place where visibility is decided. */
export function scopeSnapshots(snapshots: ShipmentSnapshot[], persona: Persona): ShipmentSnapshot[] {
  return persona.kind === "ops"
    ? snapshots.filter((s) => persona.siteIds.includes(s.shipment.originSiteId))
    : snapshots.filter((s) => s.shipment.customerId === persona.customerId);
}

/**
 * Why a shipment looked up by reference or order number is not in an operations persona's
 * perimeter. Internal staff may learn that it exists and who handles it; customers never do.
 */
export function explainLookupMiss(
  lookup: { reference?: string; orderNumber?: string },
  persona: Extract<Persona, { kind: "ops" }>,
  shipments: Shipment[],
): string {
  const asked = lookup.reference ?? `order ${lookup.orderNumber}`;
  const sh = shipments.find((s) =>
    lookup.reference ? s.reference.toUpperCase() === lookup.reference.toUpperCase() : s.orderNumber === lookup.orderNumber,
  );
  if (!sh) return `There is no ${asked} in the system. Check the number.`;
  const site = siteById(sh.originSiteId);
  const owner = PERSONAS.find((p) => p.kind === "ops" && p.siteIds.includes(sh.originSiteId));
  const yours = persona.siteIds.map((id) => siteById(id).name).join(" and ");
  return `${asked} ships from the ${site.name}, which is not one of your sites (${yours})${owner ? `. ${owner.name} handles it.` : "."}`;
}
