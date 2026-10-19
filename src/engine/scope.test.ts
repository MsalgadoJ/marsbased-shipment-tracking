import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { RAW_EVENTS, SHIPMENTS } from "@/data/shipments";
import { iso } from "@/data/time";
import { explainLookupMiss, scopeSnapshots } from "./scope";
import { buildSnapshots } from "./snapshot";

const all = buildSnapshots(SHIPMENTS, RAW_EVENTS, iso(0));

describe("scopeSnapshots", () => {
  it.each(PERSONAS.filter((p) => p.kind === "customer"))("shows $name only their own shipments", (p) => {
    const mine = scopeSnapshots(all, p);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((s) => p.kind === "customer" && s.shipment.customerId === p.customerId)).toBe(true);
  });

  it("limits operations to their sites", () => {
    const miguel = PERSONAS.find((p) => p.id === "miguel")!;
    expect(scopeSnapshots(all, miguel).every((s) => s.shipment.originSiteId === "AVE")).toBe(true);
  });
});

describe("explainLookupMiss", () => {
  const lucia = PERSONAS.find((p) => p.id === "lucia")! as Extract<(typeof PERSONAS)[number], { kind: "ops" }>;

  it("gives the same answer for another site's shipment and for one that does not exist", () => {
    expect(explainLookupMiss({ reference: "SH-1078" }, lucia)).toBe(
      "SH-1078 is not in your sites (Paterna factory and Zaragoza warehouse).",
    );
    expect(explainLookupMiss({ reference: "SH-9999" }, lucia)).toBe(
      "SH-9999 is not in your sites (Paterna factory and Zaragoza warehouse).",
    );
  });
});
