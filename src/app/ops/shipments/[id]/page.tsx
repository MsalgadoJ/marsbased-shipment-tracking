import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { SHIPMENTS } from "@/data/shipments";
import { OpsShipment } from "./ops-shipment";

export function generateStaticParams() {
  return SHIPMENTS.map((s) => ({ id: s.id }));
}

// `params` is read inside Suspense so navigation stays instant (Cache Components).
export default function Page({ params }: PageProps<"/ops/shipments/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: PageProps<"/ops/shipments/[id]">["params"] }) {
  const { id } = await params;
  return <OpsShipment id={id} />;
}
