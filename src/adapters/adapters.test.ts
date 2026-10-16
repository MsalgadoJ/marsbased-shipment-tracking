import { describe, expect, it } from "vitest";
import { AI_CONFIDENCE_THRESHOLD, fromEuroRoute, fromLevante, fromMareterra, fromNordia, fromRapido } from ".";

describe("operator adapters", () => {
  it("maps Transportes Levante Spanish codes", () => {
    const r = fromLevante({ kind: "levante", id: "1", ref: "TLV-1", codigo: "RCG", ts: "2026-10-19T06:00:00.000Z", poblacion: "Paterna", fecha_prevista: "2026-10-20" });
    expect(r).toMatchObject({ ok: true, code: "picked_up", parsedBy: "rule", operatorEta: "2026-10-20T10:00:00.000Z" });
  });

  it("reads EuroRoute local time (CEST) into UTC", () => {
    const r = fromEuroRoute({ kind: "euroroute", id: "1", consignment: "ER-1", status: "At cross-dock", time: "19/10/2026 08:00", place: "Lyon" });
    expect(r).toMatchObject({ ok: true, code: "arrived_hub", at: "2026-10-19T06:00:00.000Z" });
  });

  it("reads EuroRoute local time after the switch to winter time (CET)", () => {
    const r = fromEuroRoute({ kind: "euroroute", id: "1", consignment: "ER-1", status: "Delivered", time: "26/10/2026 08:00", place: "Lyon" });
    expect(r.at).toBe("2026-10-26T07:00:00.000Z");
  });

  it("maps Mareterra EDI codes and the carrier's ETA", () => {
    const r = fromMareterra({ kind: "edi", id: "1", bl: "B", statusCode: "DEPA", dateTime: "202610150600", locode: "ESVLC", eta: "20261028" });
    expect(r).toMatchObject({ ok: true, code: "vessel_departed", location: "Valencia", at: "2026-10-15T06:00:00.000Z" });
    expect(r.ok && r.operatorEta?.startsWith("2026-10-28")).toBe(true);
  });

  it("reports an unknown code instead of guessing", () => {
    const r = fromMareterra({ kind: "edi", id: "1", bl: "B", statusCode: "ROLL", dateTime: "202610150600", locode: "ESVLC" });
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("ROLL") });
  });

  it("maps courier API statuses", () => {
    const r = fromRapido({ kind: "courier_api", id: "1", trackingNumber: "R1", status: "ATTEMPT_FAILED", datetime: "2026-10-19T04:00:00.000Z", city: "Bilbao" });
    expect(r).toMatchObject({ ok: true, code: "delivery_failed" });
  });

  describe("forwarder emails (AI extraction)", () => {
    it("extracts a customs hold with its evidence sentence", () => {
      const r = fromNordia({
        kind: "email",
        id: "1",
        from: "x@nordia.example",
        receivedAt: "2026-10-19T00:00:00.000Z",
        subject: "File NFP-UK-20931",
        body: "Hi,\nHMRC has placed file NFP-UK-20931 on hold at Southampton. Please send the certificate.",
      });
      expect(r).toMatchObject({ ok: true, code: "customs_hold", parsedBy: "ai", location: "Southampton", ref: "NFP-UK-20931" });
      expect(r.ok && r.confidence).toBeGreaterThanOrEqual(AI_CONFIDENCE_THRESHOLD);
      expect(r.ok && r.detail).toContain("on hold");
    });

    it("sends an email it cannot read to review, not to the timeline", () => {
      const r = fromNordia({
        kind: "email",
        id: "1",
        from: "x@nordia.example",
        receivedAt: "2026-10-19T00:00:00.000Z",
        subject: "Quick question",
        body: "Can you call us about the delivery slot for NFP-UK-20931?",
      });
      expect(r.ok).toBe(false);
    });
  });
});
