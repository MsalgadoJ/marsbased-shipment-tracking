"use client";

import { Clock, FastForward, RotateCcw, SkipForward } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PERSONAS, type Persona } from "@/data/personas";
import { COMPANY } from "@/data/reference";
import { RAW_EVENTS, SHIPMENTS } from "@/data/shipments";
import { iso } from "@/data/time";
import { formatDateTime } from "@/domain/format";
import { arrivals, hoursToNextArrival, type FeedItem } from "@/engine/feed";
import { useDemo, usePersona } from "@/store/demo";
import { Button, Card } from "./ui";

const homeOf = (p: Persona) => (p.kind === "ops" ? "/ops" : "/customer");

export function AppHeader() {
  const persona = usePersona();
  const setPersona = useDemo((s) => s.setPersona);
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          {COMPANY} <span className="font-normal text-slate-500">· Shipment tracking</span>
        </Link>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Viewing as</span>
          <select
            value={persona.id}
            onChange={(e) => {
              const next = PERSONAS.find((p) => p.id === e.target.value)!;
              setPersona(next.id);
              router.push(homeOf(next));
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            {(["ops", "customer"] as const).map((kind) => (
              <optgroup key={kind} label={kind === "ops" ? "Operations" : "Customers"}>
                {PERSONAS.filter((p) => p.kind === kind).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <DemoControls />
    </header>
  );
}

/**
 * Demo clock and event injection. Moving the clock reveals the operator updates that "arrive"
 * in that interval; every view is rebuilt from them, as it would be on a webhook.
 */
function DemoControls() {
  const { clockH, advance, reset } = useDemo();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const now = iso(clockH);
  const next = hoursToNextArrival(RAW_EVENTS, now);

  function move(hours: number) {
    setFeed(arrivals(SHIPMENTS, RAW_EVENTS, now, iso(clockH + hours)));
    advance(hours);
  }

  return (
    <div className="border-t border-dashed border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
          <Clock className="size-4 text-slate-500" aria-hidden /> Demo clock: {formatDateTime(now)}
        </span>
        <Button variant="secondary" onClick={() => next && move(next)} disabled={!next} title="Jump to the next operator update">
          <SkipForward className="size-4" aria-hidden /> Next update
        </Button>
        <Button variant="secondary" onClick={() => move(12)}>
          <FastForward className="size-4" aria-hidden /> +12 h
        </Button>
        <Button variant="ghost" onClick={() => {
            setFeed([]);
            reset();
          }} disabled={clockH === 0}>
          <RotateCcw className="size-4" aria-hidden /> Reset
        </Button>
        <span aria-live="polite" className="text-xs text-slate-600">
          {feed.length > 0 && (
            <>
              {feed.length} new update{feed.length > 1 ? "s" : ""}:{" "}
              {feed.slice(0, 3).map((f, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {f.shipmentId && <strong className="font-medium">{f.shipmentId}</strong>} {f.text}
                </span>
              ))}
              {feed.length > 3 && ` · +${feed.length - 3} more`}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/** Shown when the current persona cannot see this area: the perimeter, enforced in the UI. */
export function RequirePersona({ kind, children }: { kind: Persona["kind"]; children: ReactNode }) {
  const persona = usePersona();
  const setPersona = useDemo((s) => s.setPersona);
  if (persona.kind === kind) return children;
  return (
    <Card className="mx-auto max-w-lg p-6">
      <p className="mb-4 text-sm text-slate-700">
        {persona.name} can&apos;t see this area. Choose {kind === "ops" ? "an operations" : "a customer"} persona:
      </p>
      <div className="space-y-2">
        {PERSONAS.filter((p) => p.kind === kind).map((p) => (
          <Button key={p.id} className="w-full justify-start" onClick={() => setPersona(p.id)}>
            {p.name} <span className="font-normal text-slate-500">· {p.title}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
