# Plan: Shipment Tracking App

Phase 2 of Research → Plan → Implement. Built from `research.md`. Each step has acceptance criteria; implementation does not start until this plan is reviewed.

## Stack (and why)

- **Next.js (App Router) + TypeScript**: MarsBased's stack, file-based routing for two role areas, trivial Vercel deploy.
- **Tailwind + shadcn/ui**: accessible primitives (dialog, command, badge, tabs) without designing them from scratch; the time goes into the product.
- **Zustand** for the client-side demo state (clock, injected events, approved actions); data is derived with pure functions, so the store stays small.
- **date-fns** for date maths; **Vitest** for the domain logic.
- No backend. Data and "AI" live in `src/` modules behind interfaces that a real API would replace.

## Architecture

```
src/
  domain/          types.ts (Shipment, Leg, Milestone, Eta, Exception…), vocabulary.ts (canonical milestones)
  data/            sites, operators, customers, shipments seed, raw operator events (per-operator shapes)
  adapters/        one adapter per operator: raw event → Milestone (+ "unknown" handling)
  engine/          consolidate.ts (timeline), risk.ts (exceptions + severity), eta.ts (estimate + confidence + reason)
  ai/              AiService interface + mock implementation:
                     briefing(), proposeAction(), draftMessage(), parseQuery(), customerNotice()
                   mock = templates + rules over engine output, with simulated latency
  store/           demo clock, injected events, persona, approved actions
  app/
    page.tsx                  persona picker (landing)
    ops/page.tsx              briefing + exception queue + NL search + portfolio table
    ops/shipments/[id]        detail: consolidated timeline, raw events, ETA provenance, actions
    customer/page.tsx         my shipments + notices
    customer/shipments/[id]   simplified timeline, ETA, documents
  components/      timeline, eta-badge (confirmed vs estimated), exception-card, demo-controls, query-chips…
```

Data flow: `raw events (≤ demo clock)` → adapters → `consolidate` → `risk` + `eta` → views. The AI mock reads only engine output, which is the guardrail in code: it cannot introduce a status the engine did not compute.

## Steps

| # | Step | Box | Acceptance criteria |
|---|---|---|---|
| 0 | Scaffold Next.js + Tailwind + Vitest; README run instructions; first commit (shadcn/ui moved to step 4, when the first component needs it) | 0.25 h | `pnpm dev`, `pnpm test`, `pnpm build` pass |
| 1 | Domain types + canonical vocabulary + synthetic data (3 sites, 5 operators with different raw shapes, 4 customers, ~25 shipments covering: domestic road, international road, road→sea→road with customs, delivered, on time, at risk, customs hold, stale, one unknown status) | 1 h | Every exception type and the persona perimeters are represented in the seed |
| 2 | Adapters + consolidation + risk + ETA engine, with Vitest tests | 1.25 h | Tests cover each adapter, the unknown-status path, stale detection, and confirmed vs estimated ETA |
| 3 | AI mock service (briefing, actions, drafts, NL query → filter, customer notice) | 0.75 h | NL parser handles the brief's examples ("shipments to France this week running late", "what's going on with order 12345?"); unparseable input says so instead of guessing |
| 4 | Ops view: briefing, exception queue, NL search with editable chips, portfolio table, detail page with timeline and raw events, approve/edit drafted action | 1.5 h | Full ops demo path works end to end |
| 5 | Customer view: my shipments, notices, detail with simplified timeline and documents | 0.75 h | Customer persona never sees another customer's data or internal risk details |
| 6 | Demo controls: advance clock / inject next event; views react (queue reorders, stale appears, customer gets notice) | 0.5 h | The scripted demo below runs without reloading |
| 7 | Polish pass, empty/loading states, responsive check, deploy to Vercel | 0.5 h | Deployed URL works; no console errors |
| 8 | Write-up (≤ 4 pages) + README with the demo script | 1 h | Covers the 4 sections in the brief; fits 4 pages |

Total: 7.5 h plus 0.5 h buffer. Hours are logged in `docs/timelog.md`.

## Demo script (what the reviewer clicks)

1. Ops persona (site Valencia): briefing says what happened today; queue shows at-risk, customs hold and stale shipments with causes.
2. Open the customs hold: consolidated road → sea → customs timeline; raw events from 3 operators beside the normalised milestones; ETA marked as estimated, with reason.
3. Approve the proposed action: the drafted customer notice is edited and sent (simulated).
4. Search "shipments to France this week running late": filter chips appear and are editable.
5. Advance the clock: a new event arrives, one shipment goes stale, the queue reorders.
6. Switch to the customer persona: they see only their shipments and the plain-language notice with the new estimated date.

## Risks

- Overbuilding the data model → the seed is hand-written and only as rich as the demo script needs.
- AI looking like magic → every AI output shows a "why" and its source facts.
- Running out of time → steps 4 and 6 take priority over polish; the customer view stays lighter by design.
