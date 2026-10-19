const day = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Wed 21 Oct", in Valencia time. */
export const formatDay = (iso: string) => day.format(new Date(iso));

/** "Wed 21 Oct, 14:00", in Valencia time. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const plural = (n: number, word: string) =>
  `${n} ${n === 1 ? word : word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`}`;

/** Lower-cases the first letter only, so names inside the sentence keep their capitals. */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
