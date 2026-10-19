import Link from "next/link";
import { customerById } from "@/data/reference";
import type { ShipmentSnapshot } from "@/domain/types";
import { EtaBadge, LastUpdate, Modes, Route, StatusBadge } from "./shipment-bits";
import { Card } from "./ui";

export function PortfolioTable({ snapshots, base }: { snapshots: ShipmentSnapshot[]; base: "/ops" | "/customer" }) {
  if (snapshots.length === 0) {
    return <Card className="p-6 text-center text-sm text-neutral-500">No shipments match.</Card>;
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 uppercase">
          <tr>
            <th className="px-4 py-2 font-medium">Shipment</th>
            {base === "/ops" && <th className="px-4 py-2 font-medium">Customer</th>}
            <th className="px-4 py-2 font-medium">Route</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Delivery</th>
            <th className="px-4 py-2 font-medium">Last update</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {snapshots.map((s) => (
            <tr key={s.shipment.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5">
                <Link href={`${base}/shipments/${s.shipment.id}`} className="font-medium text-neutral-900 hover:underline">
                  {s.shipment.reference}
                </Link>
                <div className="text-xs text-neutral-500">Order {s.shipment.orderNumber}</div>
              </td>
              {base === "/ops" && <td className="px-4 py-2.5 text-neutral-700">{customerById(s.shipment.customerId).name}</td>}
              <td className="px-4 py-2.5 text-neutral-700">
                <div className="flex items-center gap-2">
                  <Modes s={s} />
                  <Route s={s} />
                </div>
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-2.5">
                <EtaBadge eta={s.eta} compact />
              </td>
              <td className="px-4 py-2.5">
                <LastUpdate s={s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
