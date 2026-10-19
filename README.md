# Shipment Tracking — prototype

Frontend prototype for the MarsBased technical test: consolidated, AI-assisted shipment visibility for an industrial manufacturer, with an operations view and a customer view.

All data is synthetic and all AI output is simulated behind the interfaces a real model would use. The write-up is in [`docs/writeup.md`](docs/writeup.md).

## Run locally

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # domain and AI-layer tests (Vitest)
pnpm build
```

## Demo script (about 5 minutes)

The demo clock starts on Monday 19 October 2026, 08:00 (Valencia). It lives in memory, so a full page reload resets it.

1. **Pick Lucía Ferrer** (operations, Paterna and Zaragoza). The briefing summarises what needs attention, and the queue shows the customs hold, the unrecognised ocean status, the failed delivery, the revised sea ETA and the silent road carrier, each with its cause and next step.
2. **Open SH-1042** (order 12345). The timeline runs road → sea → customs, and each milestone sits next to the raw event from its operator (JSON codes, EDI, emails parsed by the AI layer). The date is an **estimate** (range, confidence, reasons), because no operator has confirmed one.
3. **Approve the proposed action.** Edit the drafted email to the forwarder and the customer update if you like, then send them (simulated).
4. **Search** with the examples under the search box: "shipments to France this week running late" becomes editable chips, and "what's going on with order 12345?" answers in place. Try something it cannot use to see it say so instead of guessing.
5. **Move the clock** with "Next update" or "+12 h". The feed shows the operator updates that arrived; SH-1051 gets a confirmed one-day delay, others go stale, and deliveries complete.
6. **Switch to Amelia Hart** (Kestrel Engineering) in "Viewing as". She sees only her shipments, a plain-language notice about the customs hold, and the message approved in step 3.

## Where things are

```
src/
  domain/     types, canonical milestone vocabulary, dates (Valencia time)
  data/       synthetic sites, operators, customers, shipments, raw events, personas
  adapters/   one adapter per operator: raw event → milestone, or "unmapped"
  engine/     consolidation, ETA, exception rules, snapshots, filters, perimeter, feed
  ai/         mocked AI layer: email parsing, search → filter, briefing, actions, notices
  store/      demo state (clock, persona, sent messages) and hooks
  components/ UI
  app/        routes: / (persona picker), /ops, /ops/shipments/[id], /customer, /customer/shipments/[id]
```

## Docs

- `docs/writeup.md`: the write-up (cut, AI, architecture, assumptions and next steps)
- `docs/research.md`: problem, domain model, scope cut
- `docs/plan.md`: architecture, steps with acceptance criteria, demo script
- `docs/timelog.md`: hours spent

Built with Claude Code, following the Research → Plan → Implement flow.
