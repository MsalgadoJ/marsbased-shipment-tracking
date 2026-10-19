import { COUNTRY_NAMES, customerById, CUSTOMERS, siteById, SITES } from "@/data/reference";
import type { ExceptionType } from "@/domain/types";
import type { ShipmentFilter } from "@/engine/filter";

/**
 * Natural-language search → structured filter.
 *
 * MOCK. In production this is an LLM call with structured output: the model fills `ShipmentFilter`
 * (validated with Zod against the known countries, sites, customers and enums) and lists what it
 * could not use. The contract is the same as here: it never invents a value outside the schema,
 * the result is shown as chips the user can remove, and input it cannot use is reported, not guessed.
 */
export interface ParsedQuery {
  filter: ShipmentFilter;
  /** True when at least one clause became a filter. */
  understood: boolean;
  /** Words that carried meaning but did not map to any filter. */
  ignored: string[];
  /** Asking about one specific shipment ("what's going on with order 12345?"). */
  lookup: boolean;
}

type Rule = { pattern: RegExp; apply: (f: ShipmentFilter, m: RegExpMatchArray) => void };

const COUNTRY_WORDS: Record<string, string> = {
  france: "FR",
  french: "FR",
  germany: "DE",
  german: "DE",
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  england: "GB",
  "united states": "US",
  usa: "US",
  america: "US",
  portugal: "PT",
  portuguese: "PT",
  spain: "ES",
  spanish: "ES",
};

const SITE_WORDS: Record<string, string> = { valencia: "VLC", paterna: "VLC", zaragoza: "ZAZ", aveiro: "AVE" };

const CUSTOMER_WORDS: Record<string, string> = {
  durand: "DUR",
  lyon: "DUR",
  brenner: "BRE",
  stuttgart: "BRE",
  kestrel: "KES",
  leeds: "KES",
  "hidráulica del norte": "HNO",
  "hidraulica del norte": "HNO",
  bilbao: "HNO",
  northbay: "NBP",
  houston: "NBP",
  iberfluid: "IBF",
  porto: "IBF",
};

const EXCEPTION_WORDS: [RegExp, ExceptionType][] = [
  [/\b(held (at|by) customs|customs holds?|stuck (at|in) customs|customs)\b/, "customs_hold"],
  [/\b(stale|no (news|updates?)|silent|not reporting)\b/, "stale"],
  [/\b(failed deliver(y|ies)|delivery (attempts? )?failed|failed attempts?)\b/, "delivery_failed"],
  [/\b(missing (docs?|documents?|paperwork))\b/, "missing_document"],
  [/\b(unknown|unmapped|unrecognised|unrecognized) (status|statuses|events?|codes?)\b/, "unmapped_event"],
];

const alternation = (words: Record<string, string>) =>
  Object.keys(words)
    .sort((a, b) => b.length - a.length)
    .join("|");

const RULES: Rule[] = [
  { pattern: /\b(?:order|po)\s*(?:number|no\.?|#)?\s*(\d{5})\b/, apply: (f, m) => (f.orderNumber = m[1]) },
  { pattern: /\b(sh-\d{4})\b/, apply: (f, m) => (f.reference = m[1].toUpperCase()) },
  { pattern: /\b(\d{5})\b/, apply: (f, m) => (f.orderNumber ??= m[1]) },
  {
    pattern: new RegExp(`\\bfrom (?:the )?(${alternation(SITE_WORDS)})(?: (?:factory|warehouse|site))?\\b`),
    apply: (f, m) => (f.originSiteId = SITE_WORDS[m[1]]),
  },
  {
    pattern: new RegExp(`\\b(?:to |for |in |into )?(?:the )?(${alternation(COUNTRY_WORDS)})\\b`),
    apply: (f, m) => (f.destinationCountry = COUNTRY_WORDS[m[1]]),
  },
  {
    pattern: new RegExp(`\\b(?:to |for )?(${alternation(CUSTOMER_WORDS)})\\b`),
    apply: (f, m) => (f.customerId = CUSTOMER_WORDS[m[1]]),
  },
  { pattern: /\b(this week)\b/, apply: (f) => (f.arriving = "this_week") },
  { pattern: /\b(next week)\b/, apply: (f) => (f.arriving = "next_week") },
  { pattern: /\b(today)\b/, apply: (f) => (f.arriving = "today") },
  { pattern: /\b(tomorrow)\b/, apply: (f) => (f.arriving = "tomorrow") },
  { pattern: /\b(running late|late|delayed|delays?|behind schedule|at risk)\b/, apply: (f) => (f.late = true) },
  { pattern: /\b(by sea|sea|ocean|vessel|ship)\b/, apply: (f) => (f.mode = "sea") },
  { pattern: /\b(by road|road|truck)\b/, apply: (f) => (f.mode = "road") },
  { pattern: /\b(delivered)\b/, apply: (f) => (f.status = "delivered") },
  { pattern: /\b(in transit|on the way)\b/, apply: (f) => (f.status = "in_transit") },
  { pattern: /\b(at (the )?port)\b/, apply: (f) => (f.status = "at_port") },
  { pattern: /\b(out for delivery)\b/, apply: (f) => (f.status = "out_for_delivery") },
  { pattern: /\b(needs? (my )?attention|problems?|issues?|exceptions?)\b/, apply: (f) => (f.needsAttention = true) },
  ...EXCEPTION_WORDS.map(([pattern, type]): Rule => ({ pattern, apply: (f) => (f.exceptionType = type) })),
];

/** Words that carry no filter meaning on their own. */
const STOPWORDS = new Set(
  "a an the all any my our me show list find get give which what whats what's is are was were going on with of for to in into from at by and or that this these those shipments shipment orders order there here please arriving arrive due running any some how where when status update".split(
    " ",
  ),
);

export function parseQuery(text: string): ParsedQuery {
  let rest = ` ${text.toLowerCase().replace(/[?!.,;:]/g, " ")} `;
  const filter: ShipmentFilter = {};
  let hits = 0;

  for (const rule of RULES) {
    const m = rest.match(rule.pattern);
    if (!m) continue;
    rule.apply(filter, m);
    rest = rest.replace(m[0], " ");
    hits++;
  }

  const ignored = rest
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  return {
    filter,
    understood: hits > 0,
    ignored,
    lookup: Boolean(filter.orderNumber || filter.reference) && Object.keys(filter).length === 1,
  };
}

const ARRIVING_LABEL: Record<NonNullable<ShipmentFilter["arriving"]>, string> = {
  today: "Arriving today",
  tomorrow: "Arriving tomorrow",
  this_week: "Arriving this week",
  next_week: "Arriving next week",
};

const EXCEPTION_LABEL: Record<ExceptionType, string> = {
  customs_hold: "Customs hold",
  delivery_failed: "Failed delivery",
  delayed: "Delayed",
  delay_risk: "Delay risk",
  stale: "No recent update",
  missing_document: "Missing document",
  unmapped_event: "Unrecognised status",
};

export interface FilterChip {
  key: keyof ShipmentFilter;
  label: string;
}

/** Human labels for the active filter, one chip per key. Removing a chip removes that key. */
export function filterChips(f: ShipmentFilter): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.orderNumber) chips.push({ key: "orderNumber", label: `Order ${f.orderNumber}` });
  if (f.reference) chips.push({ key: "reference", label: f.reference });
  if (f.destinationCountry) chips.push({ key: "destinationCountry", label: `To ${COUNTRY_NAMES[f.destinationCountry]}` });
  if (f.customerId) chips.push({ key: "customerId", label: customerById(f.customerId).name });
  if (f.originSiteId) chips.push({ key: "originSiteId", label: `From ${siteById(f.originSiteId).name}` });
  if (f.arriving) chips.push({ key: "arriving", label: ARRIVING_LABEL[f.arriving] });
  if (f.late) chips.push({ key: "late", label: "Late or at risk" });
  if (f.exceptionType) chips.push({ key: "exceptionType", label: EXCEPTION_LABEL[f.exceptionType] });
  if (f.needsAttention) chips.push({ key: "needsAttention", label: "Needs attention" });
  if (f.mode) chips.push({ key: "mode", label: f.mode === "sea" ? "Includes a sea leg" : "Includes a road leg" });
  if (f.status) chips.push({ key: "status", label: `Status: ${f.status.replaceAll("_", " ")}` });
  return chips;
}

export { EXCEPTION_LABEL };

/** Example queries shown under the search box. */
export const QUERY_EXAMPLES = [
  "shipments to France this week running late",
  "what's going on with order 12345?",
  "held at customs",
  "sea shipments from Valencia with no updates",
];

/** Values a user can pick when editing a chip. */
export const FILTER_OPTIONS = {
  destinationCountry: Object.entries(COUNTRY_NAMES).map(([value, label]) => ({ value, label })),
  customerId: CUSTOMERS.map((c) => ({ value: c.id, label: c.name })),
  originSiteId: SITES.map((s) => ({ value: s.id, label: s.name })),
};
