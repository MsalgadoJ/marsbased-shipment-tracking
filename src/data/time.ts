import { HOUR, madridOffset } from "@/domain/dates";

/**
 * Demo clock. The prototype is deterministic: "now" starts at Monday 19 Oct 2026, 08:00 in Valencia,
 * and the seed is written as hour offsets from that moment.
 */
export const DEMO_START = Date.UTC(2026, 9, 19, 6, 0);

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp `h` hours from the demo start. */
export const iso = (h: number) => new Date(DEMO_START + h * HOUR).toISOString();

/** "DD/MM/YYYY HH:mm" in Madrid local time, the format EuroRoute's portal exports. */
export function euroTime(h: number): string {
  const utc = DEMO_START + h * HOUR;
  const d = new Date(utc + madridOffset(utc) * HOUR);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "DD/MM/YYYY" Madrid date. */
export const euroDate = (h: number) => euroTime(h).slice(0, 10);

/** "YYYYMMDDHHmm" UTC, the EDI timestamp format. */
export function ediTime(h: number): string {
  const d = new Date(DEMO_START + h * HOUR);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

/** "YYYYMMDD" UTC date. */
export const ediDate = (h: number) => ediTime(h).slice(0, 8);

/** "YYYY-MM-DD" Madrid date. */
export function isoDate(h: number): string {
  const [dd, mm, yyyy] = euroDate(h).split("/");
  return `${yyyy}-${mm}-${dd}`;
}
