"use client";

import { BellRing, Mail } from "lucide-react";
import Link from "next/link";
import { mockAi } from "@/ai";
import { RequirePersona } from "@/components/app-header";
import { PortfolioTable } from "@/components/portfolio-table";
import { AiTag, Card, SectionTitle } from "@/components/ui";
import { customerById } from "@/data/reference";
import { iso } from "@/data/time";
import { formatDateTime } from "@/domain/format";
import { useDemo } from "@/store/demo";
import { usePortfolio } from "@/store/hooks";

export default function CustomerPage() {
  return (
    <RequirePersona kind="customer">
      <CustomerHome />
    </RequirePersona>
  );
}

function CustomerHome() {
  const { now, persona, snapshots } = usePortfolio();
  const sent = useDemo((s) => s.sent);
  if (persona.kind !== "customer") return null;

  const customer = customerById(persona.customerId);
  const notices = snapshots.flatMap((s) => mockAi.customerNotice(s, now) ?? []);
  const ids = new Set(snapshots.map((s) => s.shipment.id));
  const messages = sent.filter((m) => m.toRole === "customer" && ids.has(m.shipmentId));
  const active = snapshots.filter((s) => !s.eta.deliveredAt);
  const late = active.filter((s) => s.eta.delayDays > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Hello {persona.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-600">
          {customer.name}: {active.length} shipment{active.length === 1 ? "" : "s"} on the way
          {late > 0 ? `, ${late} later than planned` : active.length > 0 ? ", all on time" : ""}.
        </p>
      </div>

      {(notices.length > 0 || messages.length > 0) && (
        <section>
          <SectionTitle>Updates for you</SectionTitle>
          <div className="space-y-2">
            {notices.map((n) => (
              <Card key={n.shipmentId} className="flex gap-3 p-4">
                <BellRing className={n.kind === "delivered" ? "size-5 text-emerald-600" : "size-5 text-orange-600"} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/customer/shipments/${n.shipmentId}`} className="font-medium text-slate-900 hover:underline">
                      {n.title}
                    </Link>
                    <AiTag label="Written by AI from tracking data" />
                  </div>
                  <p className="text-sm text-slate-700">{n.body}</p>
                </div>
              </Card>
            ))}
            {messages.map((m) => (
              <Card key={m.subject} className="flex gap-3 p-4">
                <Mail className="size-5 text-slate-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{m.subject}</p>
                  <p className="text-xs text-slate-500">From the logistics team · {formatDateTime(iso(m.sentAtH))}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{m.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Your shipments</SectionTitle>
        <PortfolioTable snapshots={snapshots} base="/customer" />
      </section>
    </div>
  );
}
