import type { ShipmentSnapshot } from "@/domain/types";
import { briefing, customerNotice, explainShipment, proposeAction } from "./assistant";
import { parseQuery } from "./query";

/**
 * The AI layer as the views see it. The mock resolves after a short delay so the UI handles
 * loading states as it would with a real model; swapping in an API-backed implementation
 * changes nothing upstream.
 */
export interface AiService {
  briefing: typeof briefing;
  proposeAction: typeof proposeAction;
  parseQuery: typeof parseQuery;
  customerNotice: typeof customerNotice;
  explainShipment: typeof explainShipment;
}

export const mockAi: AiService = { briefing, proposeAction, parseQuery, customerNotice, explainShipment };

const LATENCY_MS = 450;

/** Run an AI call with simulated model latency. */
export function withLatency<T>(fn: () => T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), ms));
}

export type { Briefing, CustomerNotice, DraftMessage, ProposedAction } from "./assistant";
export type { ParsedQuery } from "./query";
export type { ShipmentSnapshot };
