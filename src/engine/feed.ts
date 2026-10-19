import { normalise } from "@/adapters";
import type { RawEvent } from "@/data/raw-events";
import { operatorById } from "@/data/reference";
import { HOUR } from "@/domain/dates";
import type { Shipment } from "@/domain/types";
import { MILESTONES } from "@/domain/vocabulary";

/** One incoming operator update, as the demo feed shows it. */
export interface FeedItem {
  at: string;
  shipmentId?: string;
  text: string;
}

/**
 * Operator updates that arrive in (from, to]. This is the demo stand-in for webhooks and polling:
 * the read model is rebuilt with the new clock, and these are the events that changed it.
 */
export function arrivals(shipments: Shipment[], raw: RawEvent[], from: string, to: string): FeedItem[] {
  return raw
    .map(normalise)
    .filter((e) => e.at > from && e.at <= to)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => {
      const shipment = shipments.find((s) => s.legs.some((l) => l.operatorId === e.operatorId && l.operatorRef === e.ref));
      const what = e.ok ? MILESTONES[e.code].label : "Unrecognised update";
      return { at: e.at, shipmentId: shipment?.id, text: `${operatorById(e.operatorId).name}: ${what}${e.ok && e.location ? ` · ${e.location}` : ""}` };
    });
}

/** Whole hours from `fromIso` to the next operator update, if any. */
export function hoursToNextArrival(raw: RawEvent[], fromIso: string): number | undefined {
  const next = raw
    .map(normalise)
    .map((e) => e.at)
    .filter((at) => at > fromIso)
    .sort()[0];
  return next ? Math.ceil((Date.parse(next) - Date.parse(fromIso)) / HOUR) : undefined;
}
