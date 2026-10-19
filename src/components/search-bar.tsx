"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mockAi, withLatency, type ParsedQuery } from "@/ai";
import { FILTER_OPTIONS, filterChips, QUERY_EXAMPLES } from "@/ai/query";
import type { ShipmentSnapshot } from "@/domain/types";
import { SHIPMENTS } from "@/data/shipments";
import type { ShipmentFilter } from "@/engine/filter";
import { explainLookupMiss } from "@/engine/scope";
import { usePersona } from "@/store/demo";
import { AiTag, Badge, Button } from "./ui";

type EditableKey = keyof typeof FILTER_OPTIONS;
const isEditable = (k: keyof ShipmentFilter): k is EditableKey => k in FILTER_OPTIONS;

/**
 * Natural-language search. The parsed filter is shown as chips: the user sees exactly what the
 * AI understood, can remove a chip or change its value, and the table follows the chips.
 */
export function SearchBar({
  filter,
  onFilter,
  results,
}: {
  filter: ShipmentFilter | undefined;
  onFilter: (f: ShipmentFilter | undefined) => void;
  results: ShipmentSnapshot[];
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuery>();
  const [busy, setBusy] = useState(false);

  async function run(q: string) {
    setText(q);
    if (!q.trim()) return clear();
    setBusy(true);
    const p = await withLatency(() => mockAi.parseQuery(q));
    setBusy(false);
    setParsed(p);
    onFilter(p.understood ? p.filter : undefined);
  }

  function clear() {
    setText("");
    setParsed(undefined);
    onFilter(undefined);
  }

  function setKey<K extends keyof ShipmentFilter>(key: K, value: ShipmentFilter[K] | undefined) {
    if (!filter) return;
    const next = { ...filter, [key]: value };
    if (value === undefined) delete next[key];
    onFilter(Object.keys(next).length ? next : undefined);
  }

  const chips = filter ? filterChips(filter) : [];
  const persona = usePersona();
  const lookup = parsed?.lookup && results.length === 1 ? results[0] : undefined;
  const miss =
    parsed?.lookup && filter && results.length === 0 && persona.kind === "ops"
      ? explainLookupMiss(filter, persona, SHIPMENTS)
      : undefined;

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
        className="flex gap-2"
      >
        <label className="relative flex-1">
          <span className="sr-only">Search shipments in plain language</span>
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" aria-hidden />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask in plain language, e.g. shipments to France this week running late"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-9 pl-9 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
          {text && (
            <button type="button" onClick={clear} className="absolute top-2 right-2 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </label>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Reading…" : "Search"}
        </Button>
      </form>

      {!parsed && !busy && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          Try:
          {QUERY_EXAMPLES.map((q) => (
            <button key={q} type="button" onClick={() => run(q)} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200">
              {q}
            </button>
          ))}
        </div>
      )}

      {parsed && !parsed.understood && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          I couldn&apos;t turn that into a filter, so I&apos;m not guessing. Try a country, a customer, a site, a time window
          (&quot;this week&quot;) or a problem (&quot;late&quot;, &quot;held at customs&quot;, &quot;no updates&quot;).
        </p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <AiTag label="Understood as" />
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-slate-900 py-0.5 pr-1 pl-2.5 text-xs text-white">
              {isEditable(c.key) ? (
                <select
                  aria-label={`Change ${c.label}`}
                  value={filter![c.key]}
                  onChange={(e) => setKey(c.key, e.target.value)}
                  className="field-sizing-content cursor-pointer bg-transparent text-xs text-white focus:outline-none [&>option]:text-slate-900"
                >
                  {FILTER_OPTIONS[c.key].map((o) => (
                    <option key={o.value} value={o.value}>
                      {c.key === "destinationCountry" ? `To ${o.label}` : c.key === "originSiteId" ? `From ${o.label}` : o.label}
                    </option>
                  ))}
                </select>
              ) : (
                c.label
              )}
              <button type="button" onClick={() => setKey(c.key, undefined)} className="rounded-full p-0.5 hover:bg-white/20" aria-label={`Remove ${c.label}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <span className="text-xs text-slate-500">
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
          {parsed && parsed.ignored.length > 0 && (
            <Badge tone="medium">Not used: {parsed.ignored.join(", ")}</Badge>
          )}
        </div>
      )}

      {miss && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">{miss}</p>}

      {lookup && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-sm text-slate-800">
          <div className="mb-1">
            <AiTag label="Answer" />
          </div>
          <p>{mockAi.explainShipment(lookup)}</p>
          <Link href={`/ops/shipments/${lookup.shipment.id}`} className="mt-2 inline-block font-medium text-slate-900 underline">
            Open {lookup.shipment.reference}
          </Link>
        </div>
      )}
    </div>
  );
}
