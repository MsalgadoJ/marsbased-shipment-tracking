"use client";

import { useState } from "react";
import { BriefingCard } from "@/components/briefing-card";
import { ExceptionQueue } from "@/components/exception-queue";
import { PortfolioTable } from "@/components/portfolio-table";
import { SearchBar } from "@/components/search-bar";
import { SectionTitle } from "@/components/ui";
import { applyFilter, type ShipmentFilter } from "@/engine/filter";
import { usePortfolio } from "@/store/hooks";
import { RequirePersona } from "@/components/app-header";

export default function OpsPage() {
  const { now, persona, snapshots } = usePortfolio();
  const [filter, setFilter] = useState<ShipmentFilter>();
  const results = filter ? applyFilter(snapshots, filter, now) : snapshots;
  const queueCount = snapshots.filter((s) => s.exceptions.length > 0).length;

  return (
    <RequirePersona kind="ops">
      <div className="space-y-8">
        <BriefingCard snapshots={snapshots} now={now} scopeKey={persona.id} />

        <section>
          <SectionTitle aside={<span className="text-xs text-slate-500">most urgent first</span>}>
            Needs attention ({queueCount})
          </SectionTitle>
          <ExceptionQueue snapshots={snapshots} />
        </section>

        <section>
          <SectionTitle>All shipments ({snapshots.length})</SectionTitle>
          <div className="mb-3">
            <SearchBar filter={filter} onFilter={setFilter} results={results} />
          </div>
          <PortfolioTable snapshots={results} base="/ops" />
        </section>
      </div>
    </RequirePersona>
  );
}
