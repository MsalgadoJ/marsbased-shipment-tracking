"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { withLatency } from "@/ai";
import { RAW_EVENTS, SHIPMENTS } from "@/data/shipments";
import { iso } from "@/data/time";
import { scopeSnapshots } from "@/engine/scope";
import { buildSnapshots, byUrgency } from "@/engine/snapshot";
import { useDemo, usePersona } from "./demo";

/** Current clock as ISO plus the persona-scoped read model, most urgent first. */
export function usePortfolio() {
  const clockH = useDemo((s) => s.clockH);
  const persona = usePersona();
  const now = iso(clockH);
  const snapshots = useMemo(
    () => scopeSnapshots(buildSnapshots(SHIPMENTS, RAW_EVENTS, now), persona).sort(byUrgency),
    [now, persona],
  );
  return { now, clockH, persona, snapshots };
}

/**
 * Runs an AI call with simulated latency whenever `key` changes. `undefined` while it runs.
 * The call is an effect event, so a new closure on every render does not re-trigger it:
 * only a new key does.
 */
export function useAi<T>(key: string, fn: () => T): T | undefined {
  const [result, setResult] = useState<{ key: string; value: T }>();
  const run = useEffectEvent(fn);
  useEffect(() => {
    let live = true;
    withLatency(run).then((value) => {
      if (live) setResult({ key, value });
    });
    return () => {
      live = false;
    };
  }, [key]);
  return result?.key === key ? result.value : undefined;
}
