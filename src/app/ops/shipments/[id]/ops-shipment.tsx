"use client";

import { ArrowLeft, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { mockAi } from "@/ai";
import { EXCEPTION_LABEL } from "@/ai/query";
import { ActionPanel, actionKey } from "@/components/action-panel";
import { RequirePersona } from "@/components/app-header";
import { EtaPanel } from "@/components/eta-panel";
import { Route, SEVERITY_TONE, StatusBadge } from "@/components/shipment-bits";
import { Timeline } from "@/components/timeline";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { customerById, siteById } from "@/data/reference";
import { iso } from "@/data/time";
import { formatDateTime, formatDay } from "@/domain/format";
import { CUSTOMS_DOCUMENTS } from "@/engine/risk";
import { useDemo } from "@/store/demo";
import { usePortfolio } from "@/store/hooks";

export function OpsShipment({ id }: { id: string }) {
  return (
    <RequirePersona kind="ops">
      <Detail id={id} />
    </RequirePersona>
  );
}

function Detail({ id }: { id: string }) {
  const { snapshots, persona } = usePortfolio();
  const sent = useDemo((s) => s.sent).filter((m) => m.shipmentId === id);
  const s = snapshots.find((x) => x.shipment.id === id);

  if (!s) {
    return (
      <Card className="p-6 text-sm text-slate-600">
        {id} is not in {persona.name}&apos;s sites. <Link href="/ops" className="underline">Back to the queue</Link>
      </Card>
    );
  }

  const sh = s.shipment;
  const action = mockAi.proposeAction(s);
  const missing = sh.customsRequired ? CUSTOMS_DOCUMENTS.filter((k) => !sh.documents.some((d) => d.kind === k)) : [];

  return (
    <div className="space-y-6">
      <Link href="/ops" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden /> Queue
      </Link>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{sh.reference}</h1>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-sm text-slate-600">
              Order {sh.orderNumber} · {customerById(sh.customerId).name} · {sh.goods}
            </p>
            <p className="text-sm text-slate-500">
              From {siteById(sh.originSiteId).name} · <Route s={s} />
              {sh.customsRequired && " · customs required"}
            </p>
          </div>
          <p className="text-xs text-slate-500">Last update {s.lastUpdate ? formatDateTime(s.lastUpdate) : "none"}</p>
        </div>
        <EtaPanel eta={s.eta} shipment={sh} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <SectionTitle aside={<span className="text-xs text-slate-500">normalised milestone · raw operator event</span>}>
            Consolidated timeline
          </SectionTitle>
          <Card className="p-5">
            <Timeline s={s} audience="ops" />
          </Card>
        </section>

        <div className="space-y-6">
          <section>
            <SectionTitle>Exceptions</SectionTitle>
            {s.exceptions.length === 0 ? (
              <Card className="p-4 text-sm text-slate-500">No open exceptions.</Card>
            ) : (
              <Card className="space-y-3 p-4">
                <ul className="space-y-1.5">
                  {s.exceptions.map((e) => (
                    <li key={e.type} className="text-sm">
                      <Badge tone={SEVERITY_TONE[e.severity]}>{EXCEPTION_LABEL[e.type]}</Badge>{" "}
                      <span className="text-slate-700">{e.cause}</span>
                      <span className="text-xs text-slate-400"> · since {formatDay(e.since)}</span>
                    </li>
                  ))}
                </ul>
                {action && <ActionPanel key={actionKey(action)} action={action} />}
              </Card>
            )}
          </section>

          <section>
            <SectionTitle>Documents</SectionTitle>
            <Card className="divide-y divide-slate-100">
              {sh.documents.map((d) => (
                <div key={d.kind} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <FileText className="size-4 text-slate-400" aria-hidden />
                  <span className="text-slate-800">{d.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDay(d.uploadedAt)}</span>
                </div>
              ))}
              {missing.map((k) => (
                <div key={k} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <FileText className="size-4 text-red-400" aria-hidden />
                  <span className="text-red-700">{k.charAt(0).toUpperCase() + k.slice(1).replaceAll("_", " ")}</span>
                  <Badge tone="critical" className="ml-auto">
                    Missing
                  </Badge>
                </div>
              ))}
            </Card>
          </section>

          {sent.length > 0 && (
            <section>
              <SectionTitle>Messages sent</SectionTitle>
              <Card className="divide-y divide-slate-100">
                {sent.map((m) => (
                  <div key={m.subject} className="px-4 py-2 text-sm">
                    <p className="flex items-center gap-2 font-medium text-slate-800">
                      <Mail className="size-4 text-slate-400" aria-hidden /> {m.subject}
                    </p>
                    <p className="text-xs text-slate-500">
                      To {m.to} · {formatDateTime(iso(m.sentAtH))}
                    </p>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
