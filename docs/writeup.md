# Shipment tracking prototype: write-up

Mayra Rincones · MarsBased technical test · 19 October 2026
Repository: github.com/MsalgadoJ/marsbased-shipment-tracking · Demo script in the README

## 1. The cut I chose, and why

The brief describes a manufacturer with three sites, several operators that each report in their own format, and shipments that combine road, sea and customs. I read the core problem as **trust**: nobody has one view they can rely on, so people chase shipments one by one. The product has to do two things well: **normalise** every operator into one timeline per shipment, and **manage by exception**, so operations see only what needs them and what to do about it.

So I went deep on four things, all on the operations side, where the work is:

1. **Exception queue with a daily briefing.** Shipments that need attention, most urgent first, each with its cause in plain words and a proposed next step.
2. **Proposed actions with drafted messages.** The forwarder email with the missing document, the customer update with the new date. A human edits and approves; nothing is sent automatically.
3. **One consolidated, multimodal timeline per shipment.** Every normalised milestone sits next to the raw operator event it came from, and a confirmed date is never shown like an estimate.
4. **Natural-language search** that becomes visible, editable filter chips.

The **customer view is complete but lighter**: own shipments only, plain-language notices, a simplified timeline and documents. Its value depends on operations having trustworthy data first.

**A demo clock** ties it together. Moving time forward brings in the operator updates "arriving" in that interval: the queue reorders, a feed goes stale, a delivery completes, and the customer gets a notice.

**Left out on purpose:** real authentication (a persona switcher simulates the perimeters, applied in one function), maps (they answer "where", not "what do I do"), i18n, document upload and real notification channels.

## 2. Where the AI adds value, and where it does not

The rule I applied everywhere: **the AI explains and proposes over facts the system already computed; it never creates a fact.** Statuses, dates and exceptions come from deterministic code. Every AI output carries the facts it was built from, which the UI shows under "why".

| Feature | User | What the AI does | Why AI here |
|---|---|---|---|
| Daily briefing | Ops | Summarises the computed exceptions into a few lines with a next step each | Turns a portfolio into "5 need attention, and this is the first thing to do" |
| Proposed action + drafts | Ops | Picks the next step and drafts the operator or customer message; human approves | Removes the busywork; a person stays accountable for what is sent |
| Reading free-text operator emails | System | Extracts milestone, reference and date from a forwarder's email, with a confidence score and the sentence it relied on | The long tail of formats. Below the threshold, the update goes to review, not to the timeline |
| Unrecognised status codes | Ops | Suggests a reading (for example, "ROLL" probably means the container was rolled to a later vessel) | The update stays off the timeline until a human confirms it |
| Natural-language search | Ops | Turns a question into a structured filter shown as chips | Fast ad hoc questions; the chips make the interpretation visible and correctable |
| Customer notices | Customer | Rewrites a computed fact in plain language, leaving internal signals out | Clarity without changing the facts |

**Where the AI is deliberately not used:** the ETA. A delivery estimate must be calibrated and explainable, so in production it would come from a statistical model trained on historical lanes (operator × route × season), not from an LLM. The prototype separates the two kinds of date in the data model and in the UI: **confirmed** (stated by an operator, with source and time) and **estimated** (a range with a confidence level and the reasons).

The prioritisation also matters. When a shipment has an unclear or silent feed, the proposed action is to get the facts from the operator first, not to give the customer a new date built on uncertain data.

**Taking it to production.** Each mocked function has the contract a real model call would have. The prototype uses templates and rules behind those same interfaces:

- LLM calls with structured output validated by a schema (for example Zod), with enums limited to the canonical vocabulary, so the model cannot return a status that does not exist.
- The model only receives the snapshot facts for the shipment or portfolio in scope, which is the guardrail and also keeps prompts small.
- Confidence thresholds route low-confidence extractions to a review queue. Approved corrections become new deterministic mappings over time.
- An evaluation set of real operator emails and questions, with expected outputs, run on every prompt change. Logging of which drafts operators edit before sending is the signal for improving them.

## 3. Technical approach and architecture

**Stack.** Next.js 16 (App Router) and TypeScript, which is MarsBased's stack and gives file-based routes for the two roles. Tailwind for the UI, Zustand for the demo state (clock, persona, sent messages), and Vitest for the domain logic. I dropped shadcn/ui from the plan once it was clear that a handful of plain Tailwind primitives were enough.

**Data flow.** The prototype is a read model rebuilt from raw events for any point in time:

```
raw operator events (≤ demo clock)
  → adapters, one per operator: raw → canonical milestone, or "unmapped" (never guessed)
  → consolidate: one timeline per shipment, events read in the context of their leg
  → ETA (confirmed vs estimated) + exception rules (deterministic)
  → AI layer: briefing, actions, drafts, notices, search (reads only this output)
  → views, scoped by persona
```

Five synthetic operators report in five shapes: JSON with Spanish codes, a portal CSV export with local times, EDI-style ocean messages, free-text emails and a courier REST API. Some details that came out of modelling the domain:

- A trucker's "delivered" at the port is a **handover**, not the customer's delivery. Consolidation reinterprets events by leg.
- **Stale** is relative to each operator's normal update cadence: 48 hours of silence is normal at sea but not for a courier.
- When two parties confirm the same step (the trucker and the terminal, for example), it is one milestone with two sources.
- An operator date that has already passed stops being a confirmation.

**Quality.** 40 Vitest tests cover each adapter, the unknown-status path, stale detection, confirmed vs estimated ETA, the search parser (including input it cannot use), the action priority and the persona perimeter. All dates are computed in Valencia time, so the tests do not depend on the machine's timezone. I also walked the demo script end to end with Playwright before delivering. That caught one framework issue: Next 16 with Cache Components requires `params` to be read inside Suspense.

**How I worked with AI.** I used Claude Code throughout, following MarsBased's Research → Plan → Implement flow with review points. `docs/research.md` (problem, domain, scope cut) and `docs/plan.md` (architecture, steps with acceptance criteria, demo script) were reviewed before any code was written. Each step was committed separately with its tests, and `docs/timelog.md` records the time spent.

## 4. Assumptions, limitations and next steps

**Assumptions**
- One shipment is one order to one destination; no split or consolidated shipments.
- Customers see operator names and estimate confidence (high / medium / low), but not internal notes, stale feeds or unrecognised codes.
- Customs is required for destinations outside the EU, and a missing certificate of origin is the typical blocker.

**Limitations**
- The AI is simulated with templates and rules. The search understands a fixed vocabulary of countries, sites, customers, time windows and problems; anything else is reported as "not used" rather than guessed.
- The demo state (clock, persona, messages sent) lives in the browser tab, not on a server: each reviewer has their own demo.
- The ETA model is a heuristic standing in for a trained model.
- Accessibility is limited to sensible defaults (semantic HTML, labels, focus states); there was no audit.

**Next steps, in order**
1. Real integrations behind the same adapter interface: operator webhooks and polling into an event stream, with the read model updated incrementally and pushed to the browser.
2. The review queue for low-confidence extractions and unknown codes, with "approve as mapping" turning a correction into a rule.
3. Real LLM calls behind the existing contracts, with the evaluation set described above.
4. The trained ETA model, with calibration tracked per lane.
5. Notification preferences for customers (channel, which events) and authentication with real perimeters.
