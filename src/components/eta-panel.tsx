import { operatorById } from "@/data/reference";
import { formatDateTime, formatDay } from "@/domain/format";
import type { EtaView, Shipment } from "@/domain/types";
import { confidenceRange, confirmationInDoubt, CUSTOMER_CONFIDENCE_HINT } from "./shipment-bits";
import { AiTag, Badge } from "./ui";

/**
 * The delivery date, never ambiguous about where it comes from. One date is shown: the operator's
 * confirmation when there is one, otherwise the estimate. Operations also see the estimate next to
 * a confirmation when the two disagree or the estimate has doubts (a quiet feed, an unread
 * status), because that is a risk signal. Customers get one date.
 */
export function EtaPanel({ eta, shipment, showReasons = true }: { eta: EtaView; shipment: Shipment; showReasons?: boolean }) {
  if (eta.deliveredAt) {
    return (
      <div className="rounded-lg bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
        <p className="font-medium text-emerald-800">Delivered {formatDateTime(eta.deliveredAt)}</p>
        <p className="text-emerald-700">
          Planned {formatDay(shipment.plannedDelivery)}
          {eta.delayDays > 0 ? ` · ${eta.delayDays} day${eta.delayDays > 1 ? "s" : ""} late` : " · on time"}
        </p>
      </div>
    );
  }
  const { confirmed, estimate } = eta;
  const disagree = Boolean(confirmed && estimate && formatDay(confirmed.date) !== formatDay(estimate.date));
  const showEstimate = estimate && (!confirmed || (showReasons && confirmationInDoubt(eta)));

  return (
    <div className={showEstimate && confirmed ? "grid gap-3 sm:grid-cols-2" : ""}>
      {confirmed && (
        <div className="rounded-lg p-3 text-sm ring-1 ring-slate-200">
          <div className="mb-1 flex items-center gap-2">
            {showReasons && confirmationInDoubt(eta) ? (
              <Badge tone="medium">Confirmed · may slip</Badge>
            ) : (
              <Badge tone="ok">Confirmed</Badge>
            )}
            <span className="text-xs text-slate-500">stated by the operator</span>
          </div>
          <p className="text-lg font-semibold text-slate-900">{formatDay(confirmed.date)}</p>
          <p className="text-xs text-slate-500">
            {operatorById(confirmed.operatorId).name}, reported {formatDateTime(confirmed.reportedAt)} · planned{" "}
            {formatDay(shipment.plannedDelivery)}
          </p>
        </div>
      )}
      {showEstimate && (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <AiTag label="Estimate" />
            <Badge tone={estimate.confidence === "low" ? "medium" : "neutral"}>{estimate.confidence} confidence</Badge>
            <span className="text-xs text-slate-500">
              {!confirmed ? "no operator has confirmed a date yet" : disagree ? "differs from the operator's date" : "the operator's date may not hold"}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-700 italic">~{formatDay(estimate.date)}</p>
          <p className="text-xs text-slate-500">
            between {formatDay(estimate.earliest)} and {formatDay(estimate.latest)} · planned {formatDay(shipment.plannedDelivery)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {showReasons ? confidenceRange(estimate.confidence) : CUSTOMER_CONFIDENCE_HINT[estimate.confidence]}
          </p>
          {showReasons && estimate.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
              {estimate.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
