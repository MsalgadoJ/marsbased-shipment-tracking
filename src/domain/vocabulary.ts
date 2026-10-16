/**
 * Canonical milestone vocabulary. Every operator's status codes are mapped onto these,
 * so the timeline reads the same whatever the mode or operator.
 */
export const MILESTONES = {
  picked_up: { label: "Picked up", customerLabel: "Collected from our site" },
  in_transit: { label: "In transit", customerLabel: "On its way" },
  arrived_hub: { label: "Arrived at hub", customerLabel: "At a transit hub" },
  gate_in_port: { label: "Gate in at port", customerLabel: "Arrived at the port" },
  loaded_on_vessel: { label: "Loaded on vessel", customerLabel: "Loaded on the ship" },
  vessel_departed: { label: "Vessel departed", customerLabel: "Ship departed" },
  vessel_arrived: { label: "Vessel arrived", customerLabel: "Ship arrived at destination port" },
  discharged: { label: "Discharged", customerLabel: "Unloaded at the port" },
  customs_submitted: { label: "Customs declaration submitted", customerLabel: "Customs paperwork submitted" },
  customs_hold: { label: "Held by customs", customerLabel: "Held at customs" },
  customs_cleared: { label: "Customs cleared", customerLabel: "Cleared customs" },
  out_for_delivery: { label: "Out for delivery", customerLabel: "Out for delivery" },
  delivery_failed: { label: "Delivery attempt failed", customerLabel: "Delivery attempt failed" },
  delivered: { label: "Delivered", customerLabel: "Delivered" },
} as const;

export type MilestoneCode = keyof typeof MILESTONES;
