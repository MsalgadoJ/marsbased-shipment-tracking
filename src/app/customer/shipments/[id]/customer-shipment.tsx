"use client";

import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { mockAi } from "@/ai";
import { RequirePersona } from "@/components/app-header";
import { EtaPanel } from "@/components/eta-panel";
import { StatusBadge } from "@/components/shipment-bits";
import { Timeline } from "@/components/timeline";
import { AiTag, Card, SectionTitle } from "@/components/ui";
import { siteById } from "@/data/reference";
import { formatDay } from "@/domain/format";
import type { DocumentKind } from "@/domain/types";
import { usePortfolio } from "@/store/hooks";

/** Documents a customer needs; internal paperwork (customs filings) stays with operations. */
const CUSTOMER_DOCUMENTS: DocumentKind[] = ["commercial_invoice", "packing_list", "cmr", "bill_of_lading", "proof_of_delivery"];

export function CustomerShipment({ id }: { id: string }) {
  return (
    <RequirePersona kind="customer">
      <Detail id={id} />
    </RequirePersona>
  );
}

function Detail({ id }: { id: string }) {
  const { now, snapshots } = usePortfolio();
  const s = snapshots.find((x) => x.shipment.id === id);

  // Same answer whether the shipment does not exist or belongs to someone else.
  if (!s) {
    return (
      <Card className="p-6 text-sm text-slate-600">
        Shipment not found. <Link href="/customer" className="underline">Back to your shipments</Link>
      </Card>
    );
  }

  const sh = s.shipment;
  const notice = mockAi.customerNotice(s, now);
  const docs = sh.documents.filter((d) => CUSTOMER_DOCUMENTS.includes(d.kind));

  return (
    <div className="space-y-6">
      <Link href="/customer" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden /> Your shipments
      </Link>

      <Card className="space-y-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Order {sh.orderNumber}</h1>
            <StatusBadge status={s.status} />
          </div>
          <p className="text-sm text-slate-600">
            {sh.goods} · from {siteById(sh.originSiteId).city} to {sh.destination.name} · ref. {sh.reference}
          </p>
        </div>
        {notice && (
          <div className="rounded-lg bg-orange-50 p-3 text-sm ring-1 ring-orange-200">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-orange-900">{notice.title}</span>
              <AiTag label="Written by AI from tracking data" />
            </div>
            <p className="text-orange-900">{notice.body}</p>
          </div>
        )}
        <EtaPanel eta={s.eta} shipment={sh} showReasons={false} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <SectionTitle>Journey</SectionTitle>
          <Card className="p-5">
            <Timeline s={s} audience="customer" />
          </Card>
        </section>
        <section>
          <SectionTitle>Documents</SectionTitle>
          <Card className="divide-y divide-slate-100">
            {docs.map((d) => (
              <div key={d.kind} className="flex items-center gap-2 px-4 py-2 text-sm">
                <FileText className="size-4 text-slate-400" aria-hidden />
                <span className="text-slate-800">{d.name}</span>
                <span className="ml-auto text-xs text-slate-400">{formatDay(d.uploadedAt)}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
