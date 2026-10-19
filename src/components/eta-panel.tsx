import { operatorById } from "@/data/reference";
import { formatDateTime, formatDay } from "@/domain/format";
import type { EtaView, Shipment } from "@/domain/types";
import { CONFIDENCE_HINT } from "./shipment-bits";
import { AiTag, Badge } from "./ui";

/** Confirmed date and estimate side by side, each with where it comes from. */
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
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg p-3 text-sm ring-1 ring-neutral-200">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone="ok">Confirmed</Badge>
          <span className="text-xs text-neutral-500">stated by the operator</span>
        </div>
        {eta.confirmed ? (
          <>
            <p className="text-lg font-semibold text-neutral-900">{formatDay(eta.confirmed.date)}</p>
            <p className="text-xs text-neutral-500">
              {operatorById(eta.confirmed.operatorId).name}, reported {formatDateTime(eta.confirmed.reportedAt)}
            </p>
          </>
        ) : (
          <p className="text-neutral-500">No delivery date confirmed by the operator of the final leg yet.</p>
        )}
      </div>
      <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-sm">
        <div className="mb-1 flex items-center gap-2">
          <AiTag label="Estimate" />
          {eta.estimate && <Badge tone={eta.estimate.confidence === "low" ? "medium" : "neutral"} title={CONFIDENCE_HINT}>{eta.estimate.confidence} confidence</Badge>}
        </div>
        {eta.estimate && (
          <>
            <p className="text-lg font-semibold text-neutral-700 italic">~{formatDay(eta.estimate.date)}</p>
            <p className="text-xs text-neutral-500">
              between {formatDay(eta.estimate.earliest)} and {formatDay(eta.estimate.latest)} · planned {formatDay(shipment.plannedDelivery)}
            </p>
            {showReasons && eta.estimate.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-neutral-600">
                {eta.estimate.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
