"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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

/**
 * Kept in sessionStorage so a reload or a typed URL keeps the persona, clock and sent messages;
 * "Reset" goes back to the start. Rehydrated after mount (see `useDemoHydration`) so the
 * prerendered HTML and the first client render match.
 */
export const useDemo = create<DemoState>()(
  persist(
    (set) => ({
      clockH: 0,
      personaId: "lucia",
      sent: [],
      setPersona: (personaId) => set({ personaId }),
      advance: (hours) => set((s) => ({ clockH: s.clockH + hours })),
      send: (messages) => set((s) => ({ sent: [...s.sent, ...messages] })),
      reset: () => set({ clockH: 0, sent: [] }),
    }),
    {
      name: "shipment-demo",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ clockH, personaId, sent }) => ({ clockH, personaId, sent }),
      skipHydration: true,
    },
  ),
);

/** True once the stored demo state has been loaded in the browser. */
export function useDemoHydrated() {
  return useSyncExternalStore(
    (onChange) => useDemo.persist.onFinishHydration(onChange),
    () => useDemo.persist.hasHydrated(),
    () => false,
  );
}

export const usePersona = () => personaById(useDemo((s) => s.personaId));
