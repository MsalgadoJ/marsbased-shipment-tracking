"use client";

import Link from "next/link";
import { mockAi } from "@/ai";
import { formatDateTime } from "@/domain/format";
import type { ShipmentSnapshot } from "@/domain/types";
import { useAi } from "@/store/hooks";
import { AiTag, Card, Skeleton } from "./ui";

export function BriefingCard({ snapshots, now, scopeKey }: { snapshots: ShipmentSnapshot[]; now: string; scopeKey: string }) {
  const b = useAi(`${scopeKey}@${now}`, () => mockAi.briefing(snapshots, now));

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AiTag label="Briefing" />
        <span className="text-xs text-neutral-500">as of {formatDateTime(now)}</span>
      </div>
      {!b ? (
        <div className="space-y-2" aria-busy="true" aria-label="Writing the briefing">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <>
          <p className="text-lg font-medium leading-snug text-neutral-900">{b.headline}</p>
          {b.items.length > 0 && (
            <ol className="mt-3 space-y-1.5 text-sm text-neutral-700">
              {b.items.map((item) => (
                <li key={item.shipmentId} className="flex gap-2">
                  <span className="text-neutral-400">•</span>
                  <Link href={`/ops/shipments/${item.shipmentId}`} className="hover:text-neutral-950 hover:underline">
                    {item.text}
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <details className="mt-3 text-xs text-neutral-500">
            <summary className="cursor-pointer hover:text-neutral-800">Facts this summary was written from</summary>
            <ul className="mt-1 list-disc pl-5">
              {b.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </Card>
  );
}
