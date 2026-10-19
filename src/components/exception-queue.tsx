"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { mockAi } from "@/ai";
import { customerById } from "@/data/reference";
import type { ShipmentSnapshot } from "@/domain/types";
import { EXCEPTION_LABEL } from "@/ai/query";
import { useDemo } from "@/store/demo";
import { ActionPanel, actionKey } from "./action-panel";
import { EtaBadge, Modes, Route, SEVERITY_TONE } from "./shipment-bits";
import { Badge, Button, Card } from "./ui";

/** Shipments with open exceptions, most urgent first. Each shows its causes and the proposed next step. */
export function ExceptionQueue({ snapshots }: { snapshots: ShipmentSnapshot[] }) {
  const queue = snapshots.filter((s) => s.exceptions.length > 0);
  const [open, setOpen] = useState<string>();
  const sent = useDemo((s) => s.sent);

  if (queue.length === 0) {
    return <Card className="p-6 text-center text-sm text-slate-500">Nothing needs attention right now.</Card>;
  }

  return (
    <ol className="space-y-3">
      {queue.map((s) => {
        const action = mockAi.proposeAction(s);
        const handled = action && sent.some((m) => m.actionId === action.id);
        const isOpen = open === s.shipment.id;
        return (
          <li key={s.shipment.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/ops/shipments/${s.shipment.id}`} className="font-semibold text-slate-900 hover:underline">
                      {s.shipment.reference}
                    </Link>
                    <span className="text-sm text-slate-500">Order {s.shipment.orderNumber}</span>
                    <span className="text-sm text-slate-700">{customerById(s.shipment.customerId).name}</span>
                    <Modes s={s} />
                  </div>
                  <p className="text-xs text-slate-500">
                    <Route s={s} />
                  </p>
                </div>
                <EtaBadge eta={s.eta} compact />
              </div>

              <ul className="mt-3 space-y-1">
                {s.exceptions.map((e) => (
                  <li key={e.type} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Badge tone={SEVERITY_TONE[e.severity]}>{EXCEPTION_LABEL[e.type]}</Badge>
                    <span className="text-slate-700">{e.cause}</span>
                  </li>
                ))}
              </ul>

              {action && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <p className="text-sm">
                    <span className="text-slate-500">Next step: </span>
                    <span className="font-medium text-slate-900">{action.title}</span>
                    {handled && <Badge tone="ok" className="ml-2">Sent</Badge>}
                  </p>
                  <Button onClick={() => setOpen(isOpen ? undefined : s.shipment.id)} aria-expanded={isOpen}>
                    {isOpen ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                    {isOpen ? "Close" : handled ? "View" : "Review"}
                  </Button>
                </div>
              )}
              {action && isOpen && (
                <div className="mt-3">
                  <ActionPanel key={actionKey(action)} action={action} />
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
