import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { RAW_EVENTS, SHIPMENTS } from "@/data/shipments";
import { iso } from "@/data/time";
import { scopeSnapshots } from "./scope";
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
