import { CircleAlert, CircleDot } from "lucide-react";
import { operatorById } from "@/data/reference";
import { formatDateTime, formatDay } from "@/domain/format";
import type { ShipmentSnapshot } from "@/domain/types";
import { MILESTONES } from "@/domain/vocabulary";
import { ModeIcon } from "./shipment-bits";
import { AiTag, Badge, cn } from "./ui";

/**
 * Consolidated timeline, grouped by leg. `audience="ops"` shows each milestone next to the raw
 * operator event it came from; `audience="customer"` shows plain labels only.
 */
export function Timeline({ s, audience }: { s: ShipmentSnapshot; audience: "ops" | "customer" }) {
  const legs = s.shipment.legs;
  const currentIdx = legs.findIndex((l) => l.id === s.currentLegId);

  return (
    <ol className="space-y-5">
      {legs.map((leg, i) => {
        const ms = s.milestones.filter((m) => m.legId === leg.id);
        const unmapped = audience === "ops" ? s.unmapped.filter((u) => u.legId === leg.id) : [];
        const state = s.status === "delivered" || (currentIdx !== -1 && i < currentIdx) ? "done" : i === currentIdx ? "current" : "next";
        const op = operatorById(leg.operatorId);
        return (
          <li key={leg.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full",
                  state === "done" ? "bg-emerald-100 text-emerald-700" : state === "current" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400",
                )}
              >
                <ModeIcon mode={leg.mode} />
              </span>
              <span className="font-medium text-slate-900">
                {leg.from.name} → {leg.to.name}
              </span>
              <span className="text-sm text-slate-500">
                {op.name}
                {audience === "ops" && <> · {leg.operatorRef}</>}
              </span>
              <span className="text-xs text-slate-400">
                planned {formatDay(leg.plannedDeparture)} – {formatDay(leg.plannedArrival)}
              </span>
            </div>

            {ms.length === 0 && unmapped.length === 0 ? (
              <p className="ml-9 text-sm text-slate-400">{state === "next" ? "Not started" : "No updates from the operator yet"}</p>
            ) : (
              <ol className="ml-3 space-y-2 border-l border-slate-200 pl-5">
                {ms.map((m) => (
                  <li key={m.source.rawId} className="relative">
                    <CircleDot className="absolute top-0.5 -left-[27px] size-3.5 bg-white text-slate-400" aria-hidden />
                    <div className={cn("grid gap-1", audience === "ops" && "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-4")}>
                      <div>
                        <p className="text-sm">
                          <span className={cn("font-medium", m.code === "customs_hold" || m.code === "delivery_failed" ? "text-red-700" : "text-slate-900")}>
                            {audience === "ops" ? MILESTONES[m.code].label : MILESTONES[m.code].customerLabel}
                          </span>
                          {m.location && <span className="text-slate-600"> · {m.location}</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(m.at)}
                          {m.operatorEta && <> · operator ETA {formatDay(m.operatorEta)}</>}
                        </p>
                        {m.detail && audience === "ops" && <p className="mt-0.5 text-xs text-slate-600">{m.detail}</p>}
                      </div>
                      {audience === "ops" && (
                        <div className="rounded-md bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
                          <div className="mb-0.5 flex flex-wrap items-center gap-1.5 font-sans">
                            <span className="text-slate-500">{operatorById(m.source.operatorId).name} sent</span>
                            {m.source.parsedBy === "ai" ? (
                              <AiTag label={`Parsed from email · ${Math.round(m.source.confidence * 100)}%`} />
                            ) : (
                              <Badge>Mapped by rule</Badge>
                            )}
                          </div>
                          <span className="break-words whitespace-pre-wrap">{m.source.rawSummary}</span>
                          {m.alsoReportedBy?.map((r) => (
                            <div key={r.operatorId} className="mt-1 border-t border-slate-200 pt-1">
                              <span className="font-sans text-slate-500">Also confirmed by {operatorById(r.operatorId).name}: </span>
                              {r.rawSummary}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {unmapped.map((u) => (
                  <li key={u.rawId} className="relative">
                    <CircleAlert className="absolute top-0.5 -left-[27px] size-3.5 bg-white text-amber-600" aria-hidden />
                    <p className="text-sm font-medium text-amber-800">Not on the timeline: needs review</p>
                    <p className="text-xs text-slate-600">
                      {formatDateTime(u.at)} · {u.reason}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-600">{u.rawSummary}</p>
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}
