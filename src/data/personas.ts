/**
 * Demo personas. A persona switcher stands in for authentication; the perimeter it sets is
 * applied in one place (`scopeSnapshots`), as an authorisation layer would be.
 */
export type Persona =
  | { kind: "ops"; id: string; name: string; title: string; siteIds: string[] }
  | { kind: "customer"; id: string; name: string; title: string; customerId: string };

export const PERSONAS: Persona[] = [
  { kind: "ops", id: "lucia", name: "Lucía Ferrer", title: "Logistics coordinator · Paterna & Zaragoza", siteIds: ["VLC", "ZAZ"] },
  { kind: "ops", id: "miguel", name: "Miguel Sousa", title: "Logistics coordinator · Aveiro", siteIds: ["AVE"] },
  { kind: "customer", id: "amelia", name: "Amelia Hart", title: "Purchasing · Kestrel Engineering Ltd", customerId: "KES" },
  { kind: "customer", id: "dana", name: "Dana Whitfield", title: "Supply chain · Northbay Pumps Inc (subsidiary)", customerId: "NBP" },
  { kind: "customer", id: "camille", name: "Camille Roux", title: "Purchasing · Atelier Durand SA", customerId: "DUR" },
  { kind: "customer", id: "iker", name: "Iker Etxeberria", title: "Warehouse · Hidráulica del Norte SL", customerId: "HNO" },
];

export const personaById = (id: string) => PERSONAS.find((p) => p.id === id)!;
