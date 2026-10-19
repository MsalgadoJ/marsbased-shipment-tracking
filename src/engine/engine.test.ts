import { describe, expect, it } from "vitest";
import { RAW_EVENTS, SHIPMENTS } from "@/data/shipments";
import { iso } from "@/data/time";
import { buildSnapshots, byUrgency } from "./snapshot";

const at = (h: number) => {
  const snaps = buildSnapshots(SHIPMENTS, RAW_EVENTS, iso(h));
  return (id: string) => snaps.find((s) => s.shipment.id === id)!;
};
const types = (s: { exceptions: { type: string }[] }) => s.exceptions.map((e) => e.type);

describe("consolidation", () => {
  const snap = at(0)("SH-1042");

  it("builds one multimodal timeline from three operators", () => {
    expect(snap.milestones.map((m) => m.code)).toEqual([
      "picked_up",
      "gate_in_port",
      "loaded_on_vessel",
      "vessel_departed",
      "vessel_arrived",
      "discharged",
      "customs_submitted",
      "customs_hold",
    ]);
    expect(new Set(snap.milestones.map((m) => m.source.operatorId))).toEqual(new Set(["TLV", "MTL", "NFP"]));
  });

  it("reads a trucker's 'delivered' at the port as a handover, merged with the terminal's gate-in", () => {
    const gateIn = snap.milestones[1];
    expect(gateIn).toMatchObject({ code: "gate_in_port", completesLeg: true, source: { operatorId: "TLV" } });
    expect(gateIn.alsoReportedBy?.[0].operatorId).toBe("MTL");
  });

  it("keeps the raw event next to every milestone", () => {
    expect(snap.milestones.every((m) => m.source.rawSummary.length > 0)).toBe(true);
  });
});

describe("exceptions at the demo start", () => {
  const get = at(0);

  it("flags the customs hold as critical, with the missing document", () => {
    const s = get("SH-1042");
    expect(s.status).toBe("in_customs");
    expect(s.exceptions[0]).toMatchObject({ type: "customs_hold", severity: "critical" });
    expect(types(s)).toContain("missing_document");
  });

  it("keeps an unknown carrier code out of the timeline and flags it", () => {
    const s = get("SH-1063");
    expect(s.unmapped).toHaveLength(1);
    expect(types(s)).toEqual(expect.arrayContaining(["unmapped_event", "stale", "delay_risk"]));
    expect(s.eta.estimate?.confidence).toBe("low");
  });

  it("detects a road shipment that went silent", () => {
    expect(types(get("SH-1051"))).toEqual(expect.arrayContaining(["stale", "delay_risk"]));
  });

  it("calls a late date the operator confirmed a delay, and an estimated one a risk", () => {
    expect(types(get("SH-1060"))).toContain("delayed");
    expect(types(get("SH-1060"))).not.toContain("delay_risk");
    expect(types(get("SH-1047"))).toContain("delay_risk");
    expect(types(get("SH-1047"))).not.toContain("delayed");
  });

  it("leaves on-time shipments alone", () => {
    expect(get("SH-1055").exceptions).toEqual([]);
    expect(get("SH-1074").status).toBe("planned");
  });

  it("orders the queue by urgency", () => {
    const queue = buildSnapshots(SHIPMENTS, RAW_EVENTS, iso(0)).sort(byUrgency);
    expect(queue[0].shipment.id).toBe("SH-1042");
  });
});

describe("ETA: confirmed vs estimated", () => {
  it("uses the operator's date as confirmed on the final leg", () => {
    const s = at(0)("SH-1060");
    expect(s.eta.confirmed).toMatchObject({ operatorId: "RLM" });
    expect(s.eta.delayDays).toBe(1);
  });

  it("propagates a carrier's revised sea ETA to the delivery estimate, never as confirmed", () => {
    const s = at(0)("SH-1047");
    expect(s.eta.confirmed).toBeUndefined();
    expect(s.eta.delayDays).toBe(3);
    expect(s.eta.estimate?.reasons[0]).toContain("Mareterra Line");
  });

  it("adds the customs dwell time to a held shipment", () => {
    const s = at(0)("SH-1042");
    expect(s.eta.delayDays).toBe(2);
    expect(s.eta.estimate?.reasons.join(" ")).toContain("Customs hold");
  });
});

describe("freshness: advancing the clock", () => {
  it("resolves the silent shipment once the operator reports", () => {
    const s = at(12)("SH-1051");
    expect(types(s)).not.toContain("stale");
    expect(s.eta.confirmed).toBeDefined();
    expect(s.eta.delayDays).toBe(1);
  });

  it("marks the vessel stale once the carrier misses its reporting window", () => {
    expect(types(at(0)("SH-1047"))).not.toContain("stale");
    expect(types(at(12)("SH-1047"))).toContain("stale");
  });

  it("delivers shipments whose final event arrives", () => {
    expect(at(12)("SH-1055").status).toBe("delivered");
    expect(at(12)("SH-1070").status).toBe("delivered");
  });
});
