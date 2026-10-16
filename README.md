# Shipment Tracking — prototype

Frontend prototype for the MarsBased technical test: consolidated, AI-assisted shipment visibility for an industrial manufacturer, with a customer view and an operations view.

All data is synthetic and all AI output is simulated (see `docs/`).

## Run locally

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # domain logic tests (Vitest)
pnpm build
```

## Docs

- `docs/research.md`: problem, domain model, scope cut
- `docs/plan.md`: architecture, steps with acceptance criteria, demo script
- `docs/timelog.md`: hours spent
