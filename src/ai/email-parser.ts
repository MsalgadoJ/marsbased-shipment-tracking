import type { MilestoneCode } from "@/domain/vocabulary";

/**
 * Extracts a status update from a forwarder's free-text email.
 *
 * MOCK. In production this is an LLM call with structured output (JSON schema validated with Zod):
 * { fileRef, milestone, location, eta, confidence, evidence }. The contract is the same: the model may
 * only choose from the canonical vocabulary, must quote the sentence it relied on, and anything below the
 * confidence threshold goes to a human instead of the timeline.
 */
export interface EmailExtraction {
  fileRef?: string;
  code?: MilestoneCode;
  location?: string;
  /** "YYYY-MM-DD" */
  eta?: string;
  confidence: number;
  evidence?: string;
}

const RULES: { code: MilestoneCode; pattern: RegExp; confidence: number }[] = [
  { code: "customs_hold", pattern: /\b(on hold|held by|placed .* on hold|goods held)\b/i, confidence: 0.93 },
  { code: "customs_cleared", pattern: /\b(cleared customs|released by|customs clearance granted)\b/i, confidence: 0.9 },
  { code: "customs_submitted", pattern: /\b(entry (has been )?lodged|declaration submitted)\b/i, confidence: 0.88 },
  { code: "delivered", pattern: /\b(delivered to consignee|pod attached)\b/i, confidence: 0.9 },
];

const PLACES = ["Southampton", "Dover", "Houston", "Leeds", "Felixstowe"];

export function parseOperatorEmail(subject: string, body: string): EmailExtraction {
  const text = `${subject}\n${body}`;
  const fileRef = text.match(/NFP-[A-Z]{2}-\d{5}/)?.[0];
  const rule = RULES.find((r) => r.pattern.test(text));
  const sentence = rule
    ? [...body.split(/(?<=[.!?\n])/), subject].find((s) => rule.pattern.test(s))?.trim()
    : undefined;
  const dmy = body.match(/ETA (\d{2})\/(\d{2})\/(\d{4})/);
  return {
    fileRef,
    code: rule?.code,
    location: PLACES.find((p) => text.includes(p)),
    eta: dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : undefined,
    confidence: rule && fileRef ? rule.confidence : 0.3,
    evidence: sentence,
  };
}
