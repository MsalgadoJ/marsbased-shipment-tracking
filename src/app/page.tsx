"use client";

import { Building2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PERSONAS, type Persona } from "@/data/personas";
import { useDemo } from "@/store/demo";

const GROUPS: { kind: Persona["kind"]; title: string; blurb: string; icon: typeof Building2 }[] = [
  {
    kind: "ops",
    title: "Operations",
    blurb: "What needs my attention, and what do I do about it? Briefing, exception queue, search, timelines and drafted actions.",
    icon: Building2,
  },
  {
    kind: "customer",
    title: "Customers and subsidiaries",
    blurb: "Is it on time, and when does it arrive? Own shipments only, in plain language.",
    icon: UserRound,
  },
];

export default function Home() {
  const setPersona = useDemo((s) => s.setPersona);
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">One view of every shipment</h1>
        <p className="mt-1 text-slate-600">
          Prototype with synthetic data: 3 sites, 5 logistics operators reporting in 5 different formats, road and sea legs.
          Pick who you are. The demo clock in the bar above moves time forward and brings in new operator updates.
        </p>
      </div>
      {GROUPS.map(({ kind, title, blurb, icon: Icon }) => (
        <Card key={kind} className="p-5">
          <div className="mb-3 flex items-start gap-3">
            <Icon className="mt-0.5 size-5 text-slate-500" aria-hidden />
            <div>
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-600">{blurb}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {PERSONAS.filter((p) => p.kind === kind).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPersona(p.id);
                  router.push(kind === "ops" ? "/ops" : "/customer");
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-slate-400 hover:bg-slate-50"
              >
                <span className="block text-sm font-medium text-slate-900">{p.name}</span>
                <span className="block text-xs text-slate-500">{p.title}</span>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
