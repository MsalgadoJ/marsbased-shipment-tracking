import { DAY, dayKey } from "@/domain/dates";
import type { ExceptionType, Mode, ShipmentSnapshot, ShipmentStatus } from "@/domain/types";

/**
 * Structured filter over the portfolio. The natural-language search produces one of these;
 * the views apply it with the same function, so what the chips show is exactly what is filtered.
 */
export interface ShipmentFilter {
  destinationCountry?: string;
  customerId?: string;
  originSiteId?: string;
  status?: ShipmentStatus;
  mode?: Mode;
  /** Delivery date (actual, confirmed or estimated) falls in this window, in Valencia time. */
  arriving?: "today" | "tomorrow" | "this_week" | "next_week";
  /** Late or at risk of being late. */
  late?: boolean;
  exceptionType?: ExceptionType;
  /** Any open exception. */
  needsAttention?: boolean;
  orderNumber?: string;
  reference?: string;
}

/** The date we would tell someone the shipment arrives: actual, then confirmed, then estimated. */
export function bestDeliveryDate(s: ShipmentSnapshot): string {
  return s.eta.deliveredAt ?? s.eta.confirmed?.date ?? s.eta.estimate?.date ?? s.shipment.plannedDelivery;
}

export const isLate = (s: ShipmentSnapshot) =>
  s.eta.delayDays >= 1 || s.exceptions.some((e) => e.type === "delayed" || e.type === "delay_risk");

const shiftDay = (key: string, days: number) => new Date(Date.parse(key) + days * DAY).toISOString().slice(0, 10);

/** [first, last] day keys of the window, inclusive. Weeks run Monday to Sunday. */
export function windowDays(arriving: NonNullable<ShipmentFilter["arriving"]>, now: string): [string, string] {
  const today = dayKey(now);
  const monday = shiftDay(today, -((new Date(today).getUTCDay() + 6) % 7));
  switch (arriving) {
    case "today":
      return [today, today];
    case "tomorrow":
      return [shiftDay(today, 1), shiftDay(today, 1)];
    case "this_week":
      return [monday, shiftDay(monday, 6)];
    case "next_week":
      return [shiftDay(monday, 7), shiftDay(monday, 13)];
  }
}

export function matches(s: ShipmentSnapshot, f: ShipmentFilter, now: string): boolean {
  const sh = s.shipment;
  if (f.destinationCountry && sh.destination.country !== f.destinationCountry) return false;
  if (f.customerId && sh.customerId !== f.customerId) return false;
  if (f.originSiteId && sh.originSiteId !== f.originSiteId) return false;
  if (f.status && s.status !== f.status) return false;
  if (f.mode && !sh.legs.some((l) => l.mode === f.mode)) return false;
  if (f.orderNumber && sh.orderNumber !== f.orderNumber) return false;
  if (f.reference && sh.reference.toUpperCase() !== f.reference.toUpperCase()) return false;
  if (f.late && !isLate(s)) return false;
  if (f.exceptionType && !s.exceptions.some((e) => e.type === f.exceptionType)) return false;
  if (f.needsAttention && s.exceptions.length === 0) return false;
  if (f.arriving) {
    const [first, last] = windowDays(f.arriving, now);
    const d = dayKey(bestDeliveryDate(s));
    if (d < first || d > last) return false;
  }
  return true;
}

export const applyFilter = (snapshots: ShipmentSnapshot[], f: ShipmentFilter, now: string) =>
  snapshots.filter((s) => matches(s, f, now));
