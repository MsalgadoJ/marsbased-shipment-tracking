"use client";

import { create } from "zustand";
import type { DraftMessage } from "@/ai";
import { personaById } from "@/data/personas";

export interface SentMessage extends DraftMessage {
  actionId: string;
  shipmentId: string;
  /** Demo clock hour at which it was sent. */
  sentAtH: number;
}

interface DemoState {
  /** Hours since the demo start (Mon 19 Oct 2026, 08:00 Valencia). */
  clockH: number;
  personaId: string;
  sent: SentMessage[];
  setPersona: (id: string) => void;
  advance: (hours: number) => void;
  send: (messages: SentMessage[]) => void;
  reset: () => void;
}

export const useDemo = create<DemoState>((set) => ({
  clockH: 0,
  personaId: "lucia",
  sent: [],
  setPersona: (personaId) => set({ personaId }),
  advance: (hours) => set((s) => ({ clockH: s.clockH + hours })),
  send: (messages) => set((s) => ({ sent: [...s.sent, ...messages] })),
  reset: () => set({ clockH: 0, sent: [] }),
}));

export const usePersona = () => personaById(useDemo((s) => s.personaId));
