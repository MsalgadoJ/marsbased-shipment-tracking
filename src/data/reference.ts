import type { Customer, Operator, Site } from "@/domain/types";

/** Synthetic manufacturer: Corvel Industrial, pumps and hydraulic components. */
export const COMPANY = "Corvel Industrial";

export const SITES: Site[] = [
  { id: "VLC", name: "Paterna factory", city: "Valencia", country: "ES", kind: "factory" },
  { id: "ZAZ", name: "Zaragoza warehouse", city: "Zaragoza", country: "ES", kind: "warehouse" },
  { id: "AVE", name: "Aveiro factory", city: "Aveiro", country: "PT", kind: "factory" },
];

export const OPERATORS: Operator[] = [
  { id: "TLV", name: "Transportes Levante", kind: "road_carrier", channel: "json_codes", expectedUpdateHours: 12 },
  { id: "EUR", name: "EuroRoute Logistics", kind: "road_carrier", channel: "portal_export", expectedUpdateHours: 12 },
  { id: "MTL", name: "Mareterra Line", kind: "ocean_carrier", channel: "edi", expectedUpdateHours: 48 },
  { id: "NFP", name: "Nordia Freight Partners", kind: "forwarder", channel: "email", expectedUpdateHours: 24 },
  { id: "RLM", name: "Rápido Last Mile", kind: "courier", channel: "rest_api", expectedUpdateHours: 8 },
];

export const CUSTOMERS: Customer[] = [
  { id: "DUR", name: "Atelier Durand SA", kind: "customer", city: "Lyon", country: "FR", contactName: "Camille Roux" },
  { id: "BRE", name: "Brenner Industrietechnik GmbH", kind: "customer", city: "Stuttgart", country: "DE", contactName: "Jonas Keller" },
  { id: "KES", name: "Kestrel Engineering Ltd", kind: "customer", city: "Leeds", country: "GB", contactName: "Amelia Hart" },
  { id: "HNO", name: "Hidráulica del Norte SL", kind: "customer", city: "Bilbao", country: "ES", contactName: "Iker Etxeberria" },
  { id: "NBP", name: "Northbay Pumps Inc", kind: "subsidiary", city: "Houston", country: "US", contactName: "Dana Whitfield" },
  { id: "IBF", name: "Iberfluid Portugal Lda", kind: "subsidiary", city: "Porto", country: "PT", contactName: "Rui Matos" },
];

export const COUNTRY_NAMES: Record<string, string> = {
  ES: "Spain",
  PT: "Portugal",
  FR: "France",
  DE: "Germany",
  GB: "United Kingdom",
  US: "United States",
};

export const siteById = (id: string) => SITES.find((s) => s.id === id)!;
export const operatorById = (id: string) => OPERATORS.find((o) => o.id === id)!;
export const customerById = (id: string) => CUSTOMERS.find((c) => c.id === id)!;
