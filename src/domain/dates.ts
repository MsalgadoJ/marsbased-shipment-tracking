export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** Madrid offset in hours for a UTC instant (CEST until the last Sunday of October). */
export function madridOffset(utcMs: number): number {
  const d = new Date(utcMs);
  const year = d.getUTCFullYear();
  const lastSunday = (month: number) => {
    const last = new Date(Date.UTC(year, month + 1, 0));
    return Date.UTC(year, month, last.getUTCDate() - last.getUTCDay(), 1);
  };
  return utcMs >= lastSunday(2) && utcMs < lastSunday(9) ? 2 : 1;
}

const madridDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" in Valencia time. Day comparisons use this so results do not depend on the machine's timezone. */
export const dayKey = (iso: string) => madridDay.format(new Date(iso));

/** Calendar days from `a` to `b`, in Valencia time. */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(dayKey(b)) - Date.parse(dayKey(a))) / DAY);
}

/** A date-only value ("YYYY-MM-DD") as an instant at noon Valencia time: the time of day is unknown. */
export function dateOnlyToIso(date: string): string {
  const noonUtc = Date.parse(`${date}T12:00:00Z`);
  return new Date(noonUtc - madridOffset(noonUtc) * HOUR).toISOString();
}

export const hoursBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / HOUR;

export const addHours = (iso: string, h: number) => new Date(Date.parse(iso) + h * HOUR).toISOString();
