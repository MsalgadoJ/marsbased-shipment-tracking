import type { MilestoneCode } from "./vocabulary";

export type Mode = "road" | "sea";

export interface Site {
  id: string;
  name: string;
  city: string;
  country: string;
  kind: "factory" | "warehouse";
}

export type OperatorKind = "road_carrier" | "ocean_carrier" | "forwarder" | "courier";

export interface Operator {
  id: string;
  name: string;
  kind: OperatorKind;
  /** How the operator reports status today; drives which adapter reads its events. */
  channel: "json_codes" | "edi" | "email" | "rest_api" | "portal_export";
  /** Hours without news after which an active leg with this operator counts as stale. */
  expectedUpdateHours: number;
}

export interface Customer {
  id: string;
  name: string;
  kind: "customer" | "subsidiary";
  city: string;
  country: string;
  contactName: string;
}

export interface Place {
  name: string;
  country: string;
  /** UN/LOCODE for ports, used by the ocean carrier's EDI messages. */
  locode?: string;
}

export interface Leg {
  id: string;
  mode: Mode;
  operatorId: string;
  from: Place;
  to: Place;
  /** Operator's own reference for this leg (tracking number, B/L, file number). */
  operatorRef: string;
  plannedDeparture: string;
  plannedArrival: string;
}

export type DocumentKind =
  | "commercial_invoice"
  | "packing_list"
  | "cmr"
  | "bill_of_lading"
  | "customs_declaration"
  | "certificate_of_origin"
  | "proof_of_delivery";

export interface ShipmentDocument {
  kind: DocumentKind;
  name: string;
  uploadedAt: string;
}

export interface Shipment {
  id: string;
  reference: string;
  orderNumber: string;
  originSiteId: string;
  customerId: string;
  destination: Place;
  international: boolean;
  /** Customs is part of the journey (non-EU destination). */
  customsRequired: boolean;
  legs: Leg[];
  plannedDelivery: string;
  documents: ShipmentDocument[];
  goods: string;
}

/** A normalised event on the consolidated timeline, always traceable to its raw source. */
export interface Milestone {
  code: MilestoneCode;
  at: string;
  legId: string;
  location: string;
  /** Delivery date the operator stated in this event, if any. Confirmed data, not an estimate. */
  operatorEta?: string;
  detail?: string;
  /** True when this event closes its leg (handover to the next leg, or final delivery). */
  completesLeg: boolean;
  /** Same milestone reported by another party (e.g. the trucker and the terminal both confirm gate-in). */
  alsoReportedBy?: { operatorId: string; rawSummary: string }[];
  source: {
    operatorId: string;
    rawId: string;
    rawSummary: string;
    /** "rule" = deterministic mapping; "ai" = parsed from free text by the AI layer. */
    parsedBy: "rule" | "ai";
    confidence: number;
  };
}

/** An operator event that could not be mapped with enough confidence. Never guessed into the timeline. */
export interface UnmappedEvent {
  legId: string;
  at: string;
  operatorId: string;
  rawId: string;
  rawSummary: string;
  reason: string;
}

export type ShipmentStatus =
  | "planned"
  | "in_transit"
  | "at_port"
  | "in_customs"
  | "out_for_delivery"
  | "delivered";

export type Confidence = "high" | "medium" | "low";

export interface ConfirmedEta {
  date: string;
  operatorId: string;
  reportedAt: string;
}

export interface EstimatedEta {
  date: string;
  earliest: string;
  latest: string;
  confidence: Confidence;
  reasons: string[];
}

export interface EtaView {
  /** Last delivery date stated by an operator for the final leg. */
  confirmed?: ConfirmedEta;
  /** Model estimate; always present until delivery. */
  estimate?: EstimatedEta;
  deliveredAt?: string;
  /** Days between the best available date and the planned delivery (positive = late). */
  delayDays: number;
}

export type ExceptionType =
  | "customs_hold"
  | "delivery_failed"
  | "delay_risk"
  | "stale"
  | "missing_document"
  | "unmapped_event";

export type Severity = "critical" | "high" | "medium";

export interface ShipmentException {
  type: ExceptionType;
  severity: Severity;
  /** Plain statement of the fact that triggered it. */
  cause: string;
  since: string;
}

/** Everything the views and the AI layer read about a shipment at a given clock time. */
export interface ShipmentSnapshot {
  shipment: Shipment;
  milestones: Milestone[];
  unmapped: UnmappedEvent[];
  status: ShipmentStatus;
  currentLegId?: string;
  lastUpdate?: string;
  eta: EtaView;
  exceptions: ShipmentException[];
}
