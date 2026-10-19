"use client";

import { Check, Mail, Send } from "lucide-react";
import { useState } from "react";
import type { DraftMessage, ProposedAction } from "@/ai";
import { useDemo } from "@/store/demo";
import { AiTag, Badge, Button } from "./ui";

/** Remount key: a new fact (clock advanced) yields new drafts, so the editor starts again from them. */
export const actionKey = (a: ProposedAction) => `${a.id}|${a.drafts.map((d) => d.body).join("|")}`;

/**
 * A proposed action with its drafted messages. The human edits and approves; nothing is sent
 * without that click, and what was sent is recorded (and reaches the customer view).
 */
export function ActionPanel({ action }: { action: ProposedAction }) {
  const clockH = useDemo((s) => s.clockH);
  const sent = useDemo((s) => s.sent).filter((m) => m.actionId === action.id);
  const send = useDemo((s) => s.send);
  const [drafts, setDrafts] = useState<DraftMessage[]>(action.drafts);

  const edit = (i: number, patch: Partial<DraftMessage>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-4 rounded-lg border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <AiTag label="Proposed action" />
        <h3 className="font-semibold text-neutral-900">{action.title}</h3>
      </div>
      <p className="text-sm text-neutral-700">{action.why}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800">Facts this is based on</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
          {action.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </details>

      {sent.length > 0 ? (
        <div className="space-y-2">
          {sent.map((m) => (
            <div key={m.subject} className="flex items-start gap-2 rounded-md bg-white p-3 text-sm ring-1 ring-emerald-200">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="font-medium text-neutral-900">Sent to {m.to}</p>
                <p className="text-neutral-600">{m.subject}</p>
              </div>
            </div>
          ))}
        </div>
      ) : drafts.length > 0 ? (
        <>
          {drafts.map((d, i) => (
            <div key={i} className="space-y-2 rounded-md bg-white p-3 ring-1 ring-neutral-200">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Mail className="size-4 text-neutral-400" aria-hidden />
                <span className="text-neutral-500">To</span>
                <span className="font-medium text-neutral-900">{d.to}</span>
                <Badge>{d.toRole === "customer" ? "Customer" : "Operator"}</Badge>
                <AiTag label="Draft" />
              </div>
              <label className="block">
                <span className="sr-only">Subject</span>
                <input
                  value={d.subject}
                  onChange={(e) => edit(i, { subject: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm font-medium"
                />
              </label>
              <label className="block">
                <span className="sr-only">Message</span>
                <textarea
                  value={d.body}
                  onChange={(e) => edit(i, { body: e.target.value })}
                  rows={Math.min(10, d.body.split("\n").length + 1)}
                  className="w-full rounded-md border border-neutral-200 px-2 py-1 font-mono text-xs leading-relaxed text-neutral-700"
                />
              </label>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => send(drafts.map((d) => ({ ...d, actionId: action.id, shipmentId: action.shipmentId, sentAtH: clockH })))}
            >
              <Send className="size-4" aria-hidden /> Approve and send {drafts.length > 1 ? `${drafts.length} messages` : ""}
            </Button>
            <span className="text-xs text-neutral-500">Simulated: nothing leaves the prototype.</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-neutral-500">No message needed; this is a task for the team.</p>
      )}
    </div>
  );
}
