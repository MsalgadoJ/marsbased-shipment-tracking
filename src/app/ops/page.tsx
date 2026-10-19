"use client";

import { useState } from "react";
import { RequirePersona } from "@/components/app-header";
import { BriefingCard } from "@/components/briefing-card";
import { ExceptionQueue, SeverityLegend } from "@/components/exception-queue";
import { PortfolioTable } from "@/components/portfolio-table";
import { SearchBar } from "@/components/search-bar";
import { SectionTitle } from "@/components/ui";
import { applyFilter, type ShipmentFilter } from "@/engine/filter";
import { useDemo } from "@/store/demo";
import { usePortfolio } from "@/store/hooks";

export default function OpsPage() {
  const personaId = useDemo((s) => s.personaId);
  return (
    <RequirePersona kind="ops">
      {/* Keyed by persona: a search typed as one person does not carry over to another. */}
      <OpsHome key={personaId} />
    </RequirePersona>
  );
}

function OpsHome() {
  const { now, persona, snapshots } = usePortfolio();
  const [filter, setFilter] = useState<ShipmentFilter>();
  const results = filter ? applyFilter(snapshots, filter, now) : snapshots;
  const queueCount = snapshots.filter((s) => s.exceptions.length > 0).length;

  return (
    <div className="space-y-8">
      <BriefingCard snapshots={snapshots} now={now} scopeKey={persona.id} />

      <section>
        <SectionTitle aside={<SeverityLegend />}>
          Needs attention ({queueCount}) <span className="font-normal normal-case tracking-normal">· most urgent first</span>
        </SectionTitle>
        <ExceptionQueue snapshots={snapshots} />
      </section>

      <section>
        <SectionTitle>
          {filter ? `Showing ${results.length} of ${snapshots.length} shipments` : `All shipments (${snapshots.length})`}
        </SectionTitle>
        <div className="mb-3">
          <SearchBar filter={filter} onFilter={setFilter} results={results} />
        </div>
        <PortfolioTable snapshots={results} base="/ops" />
      </section>
    </div>
  );
}
