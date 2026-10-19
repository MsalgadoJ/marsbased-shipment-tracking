import { COMPANY, customerById, operatorById, siteById } from "@/data/reference";
import { dayKey } from "@/domain/dates";
import { formatDay, lowerFirst, plural } from "@/domain/format";
import type { ExceptionType, ShipmentException, ShipmentSnapshot } from "@/domain/types";
import { MILESTONES } from "@/domain/vocabulary";
import { reportingOperator } from "@/engine/eta";
import { bestDeliveryDate } from "@/engine/filter";
import { CUSTOMS_DOCUMENTS } from "@/engine/risk";
import { byUrgency } from "@/engine/snapshot";

/**
 * Briefing, proposed actions, drafted messages and customer notices.
 *
 * MOCK. In production each function is an LLM call that receives only the snapshot facts below
 * (never the raw portfolio) and returns structured output. The templates here play that role.
 * Guardrail, enforced by the inputs: the assistant explains and proposes over facts the engine
 * computed; it cannot introduce a status, a date or an exception. Every output carries the facts
 * it was built from, so the UI can show "why".
 */

export interface BriefingItem {
  shipmentId: string;
  text: string;
}

export interface Briefing {
  headline: string;
  items: BriefingItem[];
  /** The counts the summary was written from. */
  facts: string[];
}

export interface DraftMessage {
  toRole: "operator" | "customer";
  to: string;
  subject: string;
  body: string;
}

export interface ProposedAction {
  id: string;
  shipmentId: string;
  exceptionType: ExceptionType;
  title: string;
  why: string;
  facts: string[];
  drafts: DraftMessage[];
}

export interface CustomerNotice {
  shipmentId: string;
  kind: "delay" | "issue" | "delivered";
  title: string;
  body: string;
}

const snapshotFacts = (s: ShipmentSnapshot) => [
  ...s.exceptions.map((e) => e.cause),
  ...(s.eta.estimate ? [`Estimated delivery ${formatDay(s.eta.estimate.date)} (${s.eta.estimate.confidence} confidence)`] : []),
  ...(s.eta.confirmed ? [`${operatorById(s.eta.confirmed.operatorId).name} confirmed ${formatDay(s.eta.confirmed.date)}`] : []),
];

/** Suggested readings for codes the adapters do not map. Shown as a suggestion; a human confirms. */
const UNMAPPED_HINTS: Record<string, string> = {
  ROLL: `in ocean EDI, "ROLL" usually means the container was rolled over to a later vessel, which would explain the missing departure.`,
};

const shortCause = (e: ShipmentException) => e.cause.replace(/:.*$/, "");

export function briefing(snapshots: ShipmentSnapshot[], now: string): Briefing {
  const today = dayKey(now);
  const delivered = snapshots.filter((s) => s.eta.deliveredAt && dayKey(s.eta.deliveredAt) === today);
  const active = snapshots.filter((s) => !s.eta.deliveredAt && s.status !== "planned");
  const attention = snapshots.filter((s) => s.exceptions.length > 0).sort(byUrgency);
  const count = (t: ExceptionType) => attention.filter((s) => s.exceptions.some((e) => e.type === t)).length;
  const late = attention.filter((s) => s.eta.delayDays >= 1).length;
  const holds = count("customs_hold");
  const stale = count("stale");

  const parts = [
    attention.length ? `${plural(attention.length, "shipment")} need${attention.length === 1 ? "s" : ""} attention` : "Nothing needs attention",
    late ? `${late} running late` : "",
    holds ? `${holds} held at customs` : "",
    stale ? `${stale} without recent news` : "",
  ].filter(Boolean);

  const items = attention.slice(0, 5).map((s) => {
    const top = s.exceptions[0];
    const action = proposeAction(s);
    return {
      shipmentId: s.shipment.id,
      text: `${s.shipment.reference} to ${customerById(s.shipment.customerId).name}: ${lowerFirst(shortCause(top))}.${action ? ` Next: ${lowerFirst(action.title)}.` : ""}`,
    };
  });

  return {
    headline: `${parts.join(", ")}. ${plural(delivered.length, "delivery")} completed today, ${active.length} in transit.`,
    items,
    facts: [
      `${snapshots.length} shipments in scope`,
      `${attention.length} with open exceptions`,
      `${late} with delivery ≥ 1 day after plan`,
      `${holds} customs hold`,
      `${stale} stale (no update within the operator's usual cadence)`,
      `${delivered.length} delivered today`,
    ],
  };
}

/**
 * Which exception to act on first. Not always the most severe one: facts come before messages,
 * so an unclear or silent feed is chased before the customer is given a new date.
 */
const ACTION_ORDER: ExceptionType[] = ["customs_hold", "delivery_failed", "unmapped_event", "stale", "delayed", "delay_risk", "missing_document"];

function actionable(s: ShipmentSnapshot): ShipmentException | undefined {
  return [...s.exceptions].sort((a, b) => ACTION_ORDER.indexOf(a.type) - ACTION_ORDER.indexOf(b.type))[0];
}

/** The next step for the most urgent exception of a shipment, with the messages it needs. */
export function proposeAction(s: ShipmentSnapshot): ProposedAction | undefined {
  const top = actionable(s);
  if (!top) return undefined;
  const sh = s.shipment;
  const customer = customerById(sh.customerId);
  const site = siteById(sh.originSiteId);
  const facts = snapshotFacts(s);
  const id = `${sh.id}:${top.type}`;
  const newDate = s.eta.estimate ? formatDay(s.eta.estimate.date) : formatDay(bestDeliveryDate(s));
  const latest = s.eta.estimate ? formatDay(s.eta.estimate.latest) : newDate;
  const leg = sh.legs.find((l) => l.id === s.currentLegId) ?? sh.legs.at(-1)!;
  const legOperator = operatorById(leg.operatorId);

  const customerUpdate = (reason: string): DraftMessage => ({
    toRole: "customer",
    to: `${customer.contactName}, ${customer.name}`,
    subject: `Order ${sh.orderNumber}: new estimated delivery ${newDate}`,
    body: `Dear ${customer.contactName.split(" ")[0]},\n\n${reason} We now expect to deliver your order ${sh.orderNumber} (${sh.goods}) on ${newDate}${latest !== newDate ? `, and no later than ${latest}` : ""}.\n\nWe will let you know as soon as anything changes.\n\nBest regards,\n${site.name} logistics team, ${COMPANY}`,
  });

  switch (top.type) {
    case "customs_hold": {
      const missing = CUSTOMS_DOCUMENTS.filter((k) => !sh.documents.some((d) => d.kind === k)).map((k) => k.replaceAll("_", " "));
      const doc = missing[0] ?? "the document customs requested";
      return {
        id,
        shipmentId: sh.id,
        exceptionType: top.type,
        title: `Send the ${doc} to ${legOperator.name}`,
        why: `Customs will not release the goods until the ${doc} is in the file. Historically, release takes about 2 days once it arrives.`,
        facts,
        drafts: [
          {
            toRole: "operator",
            to: `${legOperator.name}, customs desk`,
            subject: `File ${leg.operatorRef}: ${doc} for the customs hold`,
            body: `Hello,\n\nPlease find attached the ${doc} for file ${leg.operatorRef} (B/L ${sh.legs.find((l) => l.mode === "sea")?.operatorRef ?? "n/a"}), held at ${leg.from.name}. Could you lodge it with customs today and confirm the expected release date?\n\nThank you,\n${site.name} logistics team, ${COMPANY}`,
          },
          customerUpdate(`Your shipment is held at customs in ${leg.from.name.replace(/^Port of /, "")} while we provide a document they asked for.`),
        ],
      };
    }
    case "delivery_failed":
      return {
        id,
        shipmentId: sh.id,
        exceptionType: top.type,
        title: `Agree a new delivery slot with ${customer.contactName}`,
        why: `${top.cause}. Confirming a slot with the customer before the next attempt avoids a second failed one.`,
        facts,
        drafts: [
          {
            toRole: "customer",
            to: `${customer.contactName}, ${customer.name}`,
            subject: `Order ${sh.orderNumber}: let's agree a delivery slot`,
            body: `Dear ${customer.contactName.split(" ")[0]},\n\n${legOperator.name} tried to deliver your order ${sh.orderNumber} on ${formatDay(top.since)}, but nobody was available to receive it. Could you tell us a time window tomorrow when someone can sign for it? We will pass it to the courier straight away.\n\nBest regards,\n${site.name} logistics team, ${COMPANY}`,
          },
        ],
      };
    case "stale": {
      const op = reportingOperator(sh, s.milestones);
      const opLeg = sh.legs.find((l) => l.operatorId === op.id && l.id === s.currentLegId) ?? leg;
      return {
        id,
        shipmentId: sh.id,
        exceptionType: top.type,
        title: `Ask ${op.name} for a status update`,
        why: `${top.cause}. Until they report, the delivery date is an estimate with low confidence.`,
        facts,
        drafts: [
          {
            toRole: "operator",
            to: `${op.name}, operations`,
            subject: `Status request: ${opLeg.operatorRef}`,
            body: `Hello,\n\nWe have had no update on ${opLeg.operatorRef} (${opLeg.from.name} → ${opLeg.to.name}) since ${formatDay(s.lastUpdate!)}. Could you confirm where the goods are now and the expected arrival at ${opLeg.to.name}?\n\nThank you,\n${site.name} logistics team, ${COMPANY}`,
          },
        ],
      };
    }
    case "unmapped_event": {
      const u = s.unmapped[0];
      const op = operatorById(u.operatorId);
      const code = Object.keys(UNMAPPED_HINTS).find((c) => u.rawSummary.includes(c));
      return {
        id,
        shipmentId: sh.id,
        exceptionType: top.type,
        title: `Review the unrecognised update from ${op.name}`,
        why: `The update was kept out of the timeline instead of being guessed.${code ? ` Suggestion to confirm: ${UNMAPPED_HINTS[code]}` : ""}`,
        facts: [...facts, `Raw message: ${u.rawSummary}`],
        drafts: [
          {
            toRole: "operator",
            to: `${op.name}, customer service`,
            subject: `${leg.operatorRef}: please confirm status ${code ?? "received"}`,
            body: `Hello,\n\nWe received an update for ${leg.operatorRef} on ${formatDay(u.at)} that we could not interpret (${u.rawSummary}). Could you confirm what it means for this shipment and the expected arrival at ${leg.to.name}?\n\nThank you,\n${site.name} logistics team, ${COMPANY}`,
          },
        ],
      };
    }
    case "delayed":
    case "delay_risk":
      if (s.eta.delayDays < 1) {
        return {
          id,
          shipmentId: sh.id,
          exceptionType: top.type,
          title: `Check with ${legOperator.name} that ${formatDay(bestDeliveryDate(s))} still holds`,
          why: `${top.cause}. The planned date is not late yet, so there is nothing to tell the customer until the operator confirms.`,
          facts,
          drafts: [],
        };
      }
      return {
        id,
        shipmentId: sh.id,
        exceptionType: top.type,
        title: `Tell ${customer.contactName} about the new date`,
        why: `${top.cause}. Telling the customer before the planned date passes avoids the call asking where the order is.`,
        facts,
        drafts: [customerUpdate(`Your shipment is running behind the original plan.`)],
      };
    case "missing_document":
      return {
        id,
        shipmentId: sh.id,
        exceptionType: top.type,
        title: `Upload the missing customs documents`,
        why: `${top.cause}. Without them the goods will be held at the border.`,
        facts,
        drafts: [],
      };
  }
}

/**
 * Plain-language notice for the customer. Only facts that change something for them:
 * a new date, a problem they can help with, or the delivery. Internal signals (stale feeds,
 * unrecognised codes, risk levels) are never mentioned as such.
 */
export function customerNotice(s: ShipmentSnapshot, now: string): CustomerNotice | undefined {
  const sh = s.shipment;
  const id = sh.id;
  const date = formatDay(bestDeliveryDate(s));
  const types = new Set(s.exceptions.map((e) => e.type));

  if (s.eta.deliveredAt) {
    return dayKey(s.eta.deliveredAt) === dayKey(now)
      ? { shipmentId: id, kind: "delivered", title: `Order ${sh.orderNumber} was delivered`, body: `Delivered on ${formatDay(s.eta.deliveredAt)}.` }
      : undefined;
  }
  if (types.has("customs_hold")) {
    const where = s.milestones.findLast((m) => m.code === "customs_hold")?.location ?? "the border";
    return {
      shipmentId: id,
      kind: "issue",
      title: `Order ${sh.orderNumber} is held at customs`,
      body: `Customs in ${where} asked for an extra document, which we are providing. New estimated delivery: ${date}${s.eta.estimate ? ` (it could be as late as ${formatDay(s.eta.estimate.latest)})` : ""}.`,
    };
  }
  if (types.has("delivery_failed")) {
    return {
      shipmentId: id,
      kind: "issue",
      title: `We could not deliver order ${sh.orderNumber}`,
      body: `The courier found nobody to receive it. We will contact you to agree a new delivery slot.`,
    };
  }
  if (s.eta.delayDays >= 1) {
    return {
      shipmentId: id,
      kind: "delay",
      title: `Order ${sh.orderNumber} will arrive later than planned`,
      body: `It was planned for ${formatDay(sh.plannedDelivery)}. ${s.eta.confirmed ? `The carrier now confirms ${date}.` : `We now estimate ${date}.`}`,
    };
  }
  return undefined;
}

/** Ops-facing answer to "what's going on with order X?". */
export function explainShipment(s: ShipmentSnapshot): string {
  const sh = s.shipment;
  const last = s.milestones.at(-1);
  const where = last ? `Last update: ${lowerFirst(MILESTONES[last.code].label)} in ${last.location} on ${formatDay(last.at)}.` : "No movement reported yet.";
  // Causes may already end in a full stop (or a quoted one), so each is closed only when needed.
  const sentence = (t: string) => (/[.!?]["”]?$/.test(t) ? t : `${t}.`);
  const issues = s.exceptions.length ? ` ${s.exceptions.map((e) => sentence(e.cause)).join(" ")}` : " No open issues.";
  const eta = s.eta.deliveredAt
    ? ` Delivered on ${formatDay(s.eta.deliveredAt)}.`
    : s.eta.confirmed
      ? ` Delivery confirmed by ${operatorById(s.eta.confirmed.operatorId).name} for ${formatDay(s.eta.confirmed.date)}.`
      : s.eta.estimate
        ? ` Estimated delivery ${formatDay(s.eta.estimate.date)} (${s.eta.estimate.confidence} confidence).`
        : "";
  const action = proposeAction(s);
  return `Order ${sh.orderNumber} (${sh.reference}) to ${customerById(sh.customerId).name}. ${where}${issues}${eta}${action ? ` Suggested next step: ${lowerFirst(action.title)}.` : ""}`;
}
