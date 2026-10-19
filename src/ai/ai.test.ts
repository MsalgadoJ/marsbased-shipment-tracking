import { describe, expect, it } from "vitest";
import { RAW_EVENTS, SHIPMENTS } from "@/data/shipments";
import { iso } from "@/data/time";
import { applyFilter } from "@/engine/filter";
import { buildSnapshots } from "@/engine/snapshot";
import { briefing, customerNotice, explainShipment, proposeAction } from "./assistant";
import { filterChips, parseQuery } from "./query";

const at = (h: number) => buildSnapshots(SHIPMENTS, RAW_EVENTS, iso(h));
const one = (h: number, id: string) => at(h).find((s) => s.shipment.id === id)!;

describe("parseQuery", () => {
  it("turns the brief's first example into country, week and lateness filters", () => {
    const q = parseQuery("shipments to France this week running late");
    expect(q.filter).toEqual({ destinationCountry: "FR", arriving: "this_week", late: true });
    expect(q.understood).toBe(true);
    expect(q.ignored).toEqual([]);
    expect(filterChips(q.filter).map((c) => c.label)).toEqual(["To France", "Arriving this week", "Late or at risk"]);
    expect(applyFilter(at(0), q.filter, iso(0)).map((s) => s.shipment.id)).toEqual(["SH-1051"]);
  });

  it("treats a question about one order as a lookup", () => {
    const q = parseQuery("what's going on with order 12345?");
    expect(q.filter).toEqual({ orderNumber: "12345" });
    expect(q.lookup).toBe(true);
    expect(applyFilter(at(0), q.filter, iso(0)).map((s) => s.shipment.id)).toEqual(["SH-1042"]);
  });

  it("combines site, mode and exception type", () => {
    const q = parseQuery("sea shipments from Valencia with no updates");
    expect(q.filter).toEqual({ mode: "sea", originSiteId: "VLC", exceptionType: "stale" });
    expect(applyFilter(at(0), q.filter, iso(0)).map((s) => s.shipment.id)).toEqual(["SH-1063"]);
  });

  it("says it did not understand instead of guessing", () => {
    const q = parseQuery("the blue ones with the nice boxes");
    expect(q.understood).toBe(false);
    expect(q.filter).toEqual({});
    expect(q.ignored).toEqual(["blue", "ones", "nice", "boxes"]);
  });

  it("reports the words it could not use next to the ones it did", () => {
    const q = parseQuery("late shipments to Germany for the fragile goods");
    expect(q.filter).toEqual({ destinationCountry: "DE", late: true });
    expect(q.ignored).toEqual(["fragile", "goods"]);
  });
});

describe("briefing", () => {
  it("summarises the portfolio from computed facts, most urgent first", () => {
    const b = briefing(at(0), iso(0));
    expect(b.headline).toMatch(/^5 shipments need attention, 4 running late, 1 held at customs, 2 without recent news\./);
    expect(b.items[0].shipmentId).toBe("SH-1042");
    expect(b.items[0].text).toContain("send the certificate of origin");
    expect(b.facts).toContain("1 customs hold");
  });
});

describe("proposeAction", () => {
  it("asks the forwarder for the missing document and drafts the customer update", () => {
    const a = proposeAction(one(0, "SH-1042"))!;
    expect(a.title).toBe("Send the certificate of origin to Nordia Freight Partners");
    expect(a.drafts.map((d) => d.toRole)).toEqual(["operator", "customer"]);
    expect(a.drafts[0].body).toContain("NFP-UK-20931");
    expect(a.facts.some((f) => f.startsWith("Held by customs"))).toBe(true);
  });

  it("suggests a reading for an unknown code without putting it on the timeline", () => {
    const s = one(0, "SH-1063");
    const a = proposeAction({ ...s, exceptions: s.exceptions.filter((e) => e.type === "unmapped_event") })!;
    expect(a.why).toContain("rolled over to a later vessel");
    expect(s.milestones.some((m) => m.source.rawSummary.includes("ROLL"))).toBe(false);
  });

  it("chases unclear facts before giving the customer a new date", () => {
    expect(proposeAction(one(0, "SH-1063"))!.exceptionType).toBe("unmapped_event");
    const silent = proposeAction(one(0, "SH-1051"))!;
    expect(silent.title).toBe("Ask EuroRoute Logistics for a status update");
    expect(silent.drafts.map((d) => d.toRole)).toEqual(["operator"]);
  });

  it("proposes nothing when there is no exception", () => {
    expect(proposeAction(one(0, "SH-1055"))).toBeUndefined();
  });
});

describe("customerNotice", () => {
  it("explains a customs hold in plain language, without internal signals", () => {
    const n = customerNotice(one(0, "SH-1042"), iso(0))!;
    expect(n.kind).toBe("issue");
    expect(n.body).toContain("Customs in Southampton");
    expect(n.body).not.toMatch(/stale|confidence|risk|certificate/i);
  });

  it("stays quiet on a shipment that is only uncertain, and speaks once the delay is confirmed", () => {
    expect(customerNotice(one(0, "SH-1051"), iso(0))).toBeUndefined();
    const later = customerNotice(one(12, "SH-1051"), iso(12))!;
    expect(later.kind).toBe("delay");
    expect(later.body).toContain("The carrier now confirms");
  });
});

describe("explainShipment", () => {
  it("answers a lookup with status, issues, date and next step", () => {
    const text = explainShipment(one(0, "SH-1042"));
    expect(text).toContain("Order 12345 (SH-1042) to Kestrel Engineering Ltd");
    expect(text).toContain("Held by customs at Southampton");
    expect(text).toContain("Suggested next step: send the certificate of origin");
  });
});
