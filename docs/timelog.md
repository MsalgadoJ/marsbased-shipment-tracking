# Time log

Budget: 8 h.

| Date | Start | End | Phase | Notes |
|---|---|---|---|---|
| 2026-10-16 | 19:00 | 19:10 | Research + Plan | Brief analysis, scope cut, plan |
| 2026-10-16 | 19:10 | 19:21 | Steps 0-2 | Scaffold, domain + synthetic data, adapters, engine, 22 tests |
| 2026-10-19 | 13:00 | 13:10 | Step 3 | AI mock: NL query → filter + chips, briefing, prioritised actions with drafts, customer notices; 35 tests |
| 2026-10-19 | 13:10 | 13:16 | Steps 4 + 6 | Ops view (briefing, queue, NL search with editable chips, table, detail with timeline + raw events, approve/edit drafts), demo clock and feed; shadcn/ui dropped (plain Tailwind primitives were enough); fixed `params` outside Suspense (Cache Components) found in a Playwright walkthrough |
| 2026-10-19 | 13:16 | 13:18 | Step 5 | Customer view (notices, sent messages, own shipments, simplified detail); perimeter tests; full demo script walked with Playwright, mobile header fixed |
| 2026-10-19 | 13:18 | 13:20 | Step 8 (draft) | Write-up draft and README with the demo script; pending human review |
| 2026-10-19 | | | Human review and testing (about 1 h 30 min) | Read the write-up, ran the demo script by hand on desktop and mobile. Fixes from the review, applied with Claude Code: demo state kept across reloads and typed URLs, clearer screen when a persona cannot see an area, keyboard focus and pointer cursor, search reset on persona change and on an emptied box, estimate confidence explained, reference lookups answer the same for another site's shipment and an unknown one, write-up wording |

Total: about 2 h 10 min of the 8 h budget.
