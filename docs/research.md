# Research: Shipment Tracking App

Phase 1 of Research → Plan → Implement. Captures what the brief asks for, the domain model it implies, and the scope cut. Reviewed by a human before the plan is written.

## 1. The problem in one paragraph

An industrial manufacturer ships from several sites (factories, warehouses) to customers and subsidiaries, domestic and international, through several logistics operators, by road and sea, often combining both in one shipment. Each operator reports status in its own format and vocabulary (portal, email, phone). Nobody has a single, trustworthy view. The product's value is **normalisation** (one vocabulary, one timeline per shipment) plus **management by exception** (surface what needs attention, propose the next action).

## 2. Users and what "done" means for each

| Role | Perimeter | Question they need answered | Success |
|---|---|---|---|
| Customer / subsidiary | Own shipments only | Is it on time? When does it arrive? | Never has to call; hears about a delay before it happens |
| Internal operations | Their site(s), accounts, role | What needs my attention now, and what do I do about it? | Stops chasing shipments one by one |

## 3. Domain model (what the prototype must represent)

- **Site**: origin factory or warehouse (3 sites, 2 countries).
- **Operator**: road carrier, ocean carrier, freight forwarder, last-mile courier. Each emits **raw events** in its own shape and vocabulary.
- **Shipment**: one order from one site to one customer. Has an ordered list of **legs**.
- **Leg**: one mode (road / sea), one operator, from → to. A shipment can be road → port → vessel → port → customs → last-mile road.
- **Milestone**: a normalised event on the consolidated timeline (`picked_up`, `departed_port`, `customs_hold`…), always linked to the raw event it came from.
- **ETA**: two kinds that must never be mixed up:
  - *Confirmed*: stated by the operator, shown as a fact with its source and timestamp.
  - *Estimated*: produced by the prediction model, shown as a range with confidence and the reason.
- **Exception**: delay risk, hold, customs incident, stale (no update beyond the expected cadence for that leg), missing document. Each has a severity, a cause and a **proposed action**.
- **Document**: commercial invoice, packing list, bill of lading, CMR, customs declaration (synthetic placeholders).

## 4. Domain challenges and how the prototype answers each

| Challenge (brief §3.5) | Answer in the prototype |
|---|---|
| Heterogeneous operators and vocabularies | Per-operator adapters map raw events to a canonical milestone vocabulary. The raw event stays visible next to the normalised one. Unknown statuses are flagged, never guessed. |
| Multimodal and international | Shipments are a sequence of legs; customs is an explicit milestone on international shipments. The timeline groups milestones by leg and mode. |
| Multi-site | Site is a first-class filter; the operations persona is scoped to its sites. |
| Freshness / real time | A demo clock and an event injector: advancing time or injecting the next event re-runs normalisation, risk and notifications, so the demo shows the view reacting. "Stale" is detected from the expected update cadence per leg type. In production: operator webhooks/polling → event stream → server push. |
| Reliability | Every status and ETA carries its provenance (`operator` vs `ai_estimate`). The AI layer never writes a status. Low confidence or unknown input becomes "needs review", not a guess. |

## 5. Where AI adds value (and where it does not)

| Feature | User | AI or rules? | Why |
|---|---|---|---|
| Exception triage + daily briefing | Ops | Risk scoring (model) + LLM summary over computed facts | Turns a portfolio into "3 at risk, 1 held at customs, 2 delivered", each with a cause |
| Proposed next action + drafted message | Ops | LLM drafts, human approves | Removes the busywork (writing the customer notice, chasing the operator); a human stays accountable |
| ETA and delay risk | Both | Statistical/ML model on historical lane data, **not** an LLM | Numbers must be calibrated and explainable; an LLM would invent them |
| Natural-language search | Ops | LLM → structured filter (validated schema), shown as editable chips | Fast for ad hoc questions; transparent and correctable |
| Normalisation of unknown vocabularies / email updates | System | Deterministic adapters first; LLM only to *suggest* mappings for unseen statuses or parse free-text emails, queued for review | Most statuses are a finite vocabulary; AI handles the long tail |
| Proactive customer notice | Customer | LLM rewrites the computed fact in plain language | Clarity and confidence, without changing the facts |

**Guardrail used across all features:** AI explains and proposes over facts the system already computed; it does not create facts.

## 6. Scope cut

**Deep:**
1. Operations exception queue with daily briefing, causes and proposed actions (approve / edit a drafted message).
2. Natural-language search that becomes visible, editable filters.
3. Consolidated multimodal timeline per shipment, with raw operator events and confirmed vs estimated ETA.
4. Demo controls (clock + event injection) that show freshness end to end: the queue reorders, a stale shipment appears, the customer receives a notice.

**Complete but lighter:**
5. Customer view: own shipments, on-time status and ETA, simplified timeline, proactive notices, documents.

**Out (justified in the write-up):** real auth (a persona switcher simulates perimeters), maps, i18n, real document upload, real notification channels, accessibility audit beyond sensible defaults, mobile-specific layouts beyond responsive basics.

## 7. Open questions / assumptions

- Assumed: the customer sees operator names but not internal notes or risk scores, only the plain-language consequence.
- Assumed: ETA confidence is shown as a date range plus a high / medium / low label, not raw percentages.
- Assumed: one shipment = one order = one destination (no split or consolidated shipments).
- Delivery: Git repository plus a Vercel deployment (asked for by the recruiter in addition to the brief), plus a write-up of 4 pages maximum.
