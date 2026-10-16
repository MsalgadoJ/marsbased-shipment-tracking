/**
 * Raw operator events, each in the operator's own shape and vocabulary.
 * This is what integrations would receive; adapters normalise it.
 */

/** Transportes Levante: JSON webhook with Spanish status codes. */
export interface LevanteEvent {
  kind: "levante";
  id: string;
  ref: string;
  /** RCG recogido, TRN en tránsito, PLT en plataforma, REP en reparto, ENT entregado, AUS destinatario ausente */
  codigo: string;
  ts: string;
  poblacion: string;
  fecha_prevista?: string;
}

/** EuroRoute Logistics: rows from a daily portal CSV export, local time as text. */
export interface EuroRouteEvent {
  kind: "euroroute";
  id: string;
  consignment: string;
  status: string;
  /** "DD/MM/YYYY HH:mm", Central European time */
  time: string;
  place: string;
  /** "DD/MM/YYYY" */
  eta?: string;
}

/** Mareterra Line: EDI-style container status message (IFTSTA-like). */
export interface MareterraEvent {
  kind: "edi";
  id: string;
  bl: string;
  /** GTIN gate in, LOAD loaded, DEPA departed, ARRI arrived, DISC discharged, GTOT gate out, … */
  statusCode: string;
  /** YYYYMMDDHHmm UTC */
  dateTime: string;
  locode: string;
  /** YYYYMMDD, estimated arrival at port of discharge */
  eta?: string;
}

/** Nordia Freight Partners: status arrives as free-text email. */
export interface NordiaEmail {
  kind: "email";
  id: string;
  from: string;
  receivedAt: string;
  subject: string;
  body: string;
}

/** Rápido Last Mile: REST API polling response. */
export interface RapidoEvent {
  kind: "courier_api";
  id: string;
  trackingNumber: string;
  status: "IN_DEPOT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "ATTEMPT_FAILED";
  datetime: string;
  city: string;
  estimatedDelivery?: string;
}

export type RawEvent = LevanteEvent | EuroRouteEvent | MareterraEvent | NordiaEmail | RapidoEvent;
