import { operatorById } from "@/data/reference";
import { addHours, dayDiff, dayKey, hoursBetween, HOUR } from "@/domain/dates";
import type { Confidence, EtaView, Milestone, Mode, Shipment, UnmappedEvent } from "@/domain/types";
import { activeCustomsHold, currentLegIndex } from "./consolidate";

/**
 * Delivery estimate.
 *
 * MOCK of the prediction model. In production this is a model trained on historical lanes
 * (operator × route × season → transit-time distribution), not an LLM: dates must be calibrated
 * and explainable. The output contract is the same: a date, a range, a confidence and the reasons.
 */

/** Synthetic historical median for a customs hold to be released once documents arrive. */
export const CUSTOMS_HOLD_HOURS = 48;

/** Hours around the estimate. A low-confidence sea leg can slip much further than a road leg. */
const RANGE: Record<Confidence, Record<Mode, [number, number]>> = {
  high: { road: [0, 12], sea: [0, 24] },
  medium: { road: [-12, 24], sea: [-24, 48] },
  low: { road: [0, 24], sea: [0, 96] },
};

const dur = (from: string, to: string) => Date.parse(to) - Date.parse(from);

export function isStale(shipment: Shipment, milestones: Milestone[], unmapped: UnmappedEvent[], now: string): boolean {
  const idx = currentLegIndex(shipment, milestones);
  if (idx >= shipment.legs.length || milestones.length === 0) return false;
  const lastUpdate = lastUpdateAt(milestones, unmapped);
  if (!lastUpdate) return false;
  return hoursBetween(lastUpdate, now) > reportingOperator(shipment, milestones).expectedUpdateHours;
}

/** The operator we are waiting to hear from: the one running the leg in progress. */
export function reportingOperator(shipment: Shipment, milestones: Milestone[]) {
  const leg = shipment.legs[Math.min(currentLegIndex(shipment, milestones), shipment.legs.length - 1)];
  return operatorById(leg.operatorId);
}

export function lastUpdateAt(milestones: Milestone[], unmapped: UnmappedEvent[]): string | undefined {
  return [...milestones.map((m) => m.at), ...unmapped.map((u) => u.at)].sort().at(-1);
}

export function computeEta(
  shipment: Shipment,
  milestones: Milestone[],
  unmapped: UnmappedEvent[],
  now: string,
): EtaView {
  const legs = shipment.legs;
  const idx = currentLegIndex(shipment, milestones);

  if (idx === legs.length) {
    const deliveredAt = milestones.at(-1)!.at;
    return { deliveredAt, delayDays: Math.max(0, dayDiff(shipment.plannedDelivery, deliveredAt)) };
  }

  const reasons: string[] = [];
  const cur = legs[idx];
  const onCur = milestones.filter((m) => m.legId === cur.id);
  const stale = isStale(shipment, milestones, unmapped, now);
  const hold = activeCustomsHold(milestones);
  const operator = operatorById(cur.operatorId);

  // Latest date the current leg's operator gave for reaching the end of its leg.
  const etaMilestone = onCur.filter((m) => m.operatorEta).at(-1);
  const isFinalLeg = idx === legs.length - 1;
  const confirmed =
    etaMilestone && isFinalLeg
      ? { date: etaMilestone.operatorEta!, operatorId: cur.operatorId, reportedAt: etaMilestone.at }
      : undefined;

  // 1. When does the current leg end?
  let arrival: number;
  const departed = onCur.find((m) => !m.code.startsWith("customs_") && m.code !== "gate_in_port" && m.code !== "loaded_on_vessel");
  if (etaMilestone) {
    arrival = Date.parse(etaMilestone.operatorEta!);
    reasons.push(`${operator.name} reported arrival at ${cur.to.name} on ${dayKey(etaMilestone.operatorEta!)}`);
  } else if (departed) {
    arrival = Date.parse(departed.at) + dur(cur.plannedDeparture, cur.plannedArrival);
    reasons.push(`Planned transit time from the actual departure (${dayKey(departed.at)})`);
  } else {
    const start = Math.max(Date.parse(cur.plannedDeparture), Date.parse(now));
    arrival = start + dur(cur.plannedDeparture, cur.plannedArrival);
    if (Date.parse(now) > Date.parse(cur.plannedDeparture) && !hold) {
      reasons.push(`Departure from ${cur.from.name} not confirmed; it was planned for ${dayKey(cur.plannedDeparture)}`);
    }
  }
  if (arrival < Date.parse(now) && etaMilestone && dayKey(etaMilestone.operatorEta!) >= dayKey(now)) {
    // A date-only ETA for today is still valid until the day ends.
    arrival = Date.parse(now);
  } else if (arrival < Date.parse(now)) {
    arrival = Date.parse(now) + Math.min(dur(cur.plannedDeparture, cur.plannedArrival) / 4, 12 * HOUR);
    reasons.push(`Expected arrival at ${cur.to.name} has passed without confirmation`);
  }
  if (hold) {
    arrival = Math.max(arrival, Date.parse(now)) + CUSTOMS_HOLD_HOURS * HOUR;
    reasons.push(`Customs hold: release usually takes ~2 days once the missing document is received`);
  }

  // 2. Propagate to the remaining legs, keeping their planned handover gaps.
  for (let i = idx + 1; i < legs.length; i++) {
    const prev = legs[i - 1];
    const next = legs[i];
    const gap = Math.max(0, dur(prev.plannedArrival, next.plannedDeparture));
    const dep = Math.max(Date.parse(next.plannedDeparture), arrival + gap);
    arrival = dep + dur(next.plannedDeparture, next.plannedArrival);
  }

  // 3. Delivery keeps the planned buffer after the last leg, never earlier than planned.
  const slip = Math.max(0, arrival - Date.parse(legs.at(-1)!.plannedArrival));
  const date = new Date(Date.parse(shipment.plannedDelivery) + slip).toISOString();

  let confidence: Confidence = etaMilestone && !stale ? "high" : "medium";
  if (stale) {
    confidence = "low";
    const reporter = reportingOperator(shipment, milestones);
    const silentHours = Math.round(hoursBetween(lastUpdateAt(milestones, unmapped)!, now));
    reasons.push(`No update from ${reporter.name} for ${silentHours} h (expected every ${reporter.expectedUpdateHours} h)`);
  }
  if (unmapped.length > 0) {
    confidence = "low";
    reasons.push(`${unmapped.length} operator update could not be interpreted and is pending review`);
  }
  if (hold) confidence = "low";

  const [lo, hi] = RANGE[confidence][cur.mode];
  const estimate = { date, earliest: addHours(date, lo), latest: addHours(date, hi), confidence, reasons };
  // An operator date that has already passed is no longer a confirmation of anything.
  const confirmedValid = confirmed && dayKey(confirmed.date) >= dayKey(now) ? confirmed : undefined;
  const best = confirmedValid?.date ?? date;
  return { confirmed: confirmedValid, estimate, delayDays: dayDiff(shipment.plannedDelivery, best) };
}
