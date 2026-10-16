import type { DocumentKind, Leg, Place, Shipment, ShipmentDocument } from "@/domain/types";
import type { RawEvent } from "./raw-events";
import { customerById, siteById } from "./reference";
import { ediDate, ediTime, euroDate, euroTime, iso, isoDate } from "./time";

/**
 * Synthetic portfolio. Hours are offsets from the demo start (Mon 19 Oct 2026, 08:00 Valencia).
 * Events with a positive offset have not happened yet: advancing the demo clock reveals them.
 */

const P = {
  paterna: { name: "Paterna", country: "ES" },
  zaragoza: { name: "Zaragoza", country: "ES" },
  aveiro: { name: "Aveiro", country: "PT" },
  vlcPort: { name: "Port of Valencia", country: "ES", locode: "ESVLC" },
  southampton: { name: "Port of Southampton", country: "GB", locode: "GBSOU" },
  houston: { name: "Port of Houston", country: "US", locode: "USHOU" },
  bilbaoHub: { name: "Bilbao hub", country: "ES" },
  calais: { name: "Calais", country: "FR" },
  lyon: { name: "Lyon", country: "FR" },
  stuttgart: { name: "Stuttgart", country: "DE" },
  leeds: { name: "Leeds", country: "GB" },
  bilbao: { name: "Bilbao", country: "ES" },
  porto: { name: "Porto", country: "PT" },
  houstonCity: { name: "Houston", country: "US" },
} satisfies Record<string, Place>;

const DEST: Record<string, Place> = {
  DUR: P.lyon,
  BRE: P.stuttgart,
  KES: P.leeds,
  HNO: P.bilbao,
  NBP: P.houstonCity,
  IBF: P.porto,
};

const DOC_NAMES: Record<DocumentKind, string> = {
  commercial_invoice: "Commercial invoice",
  packing_list: "Packing list",
  cmr: "CMR consignment note",
  bill_of_lading: "Bill of lading",
  customs_declaration: "Customs declaration",
  certificate_of_origin: "Certificate of origin",
  proof_of_delivery: "Proof of delivery",
};

const docs = (h: number, ...kinds: DocumentKind[]): ShipmentDocument[] =>
  kinds.map((kind, i) => ({ kind, name: DOC_NAMES[kind], uploadedAt: iso(h + i) }));

const leg = (
  id: string,
  mode: Leg["mode"],
  operatorId: string,
  from: Place,
  to: Place,
  operatorRef: string,
  depH: number,
  arrH: number,
): Leg => ({ id, mode, operatorId, from, to, operatorRef, plannedDeparture: iso(depH), plannedArrival: iso(arrH) });

interface SeedShipment {
  id: string;
  orderNumber: string;
  originSiteId: string;
  customerId: string;
  legs: Leg[];
  plannedDeliveryH: number;
  documents: ShipmentDocument[];
  goods: string;
}

const build = (s: SeedShipment): Shipment => {
  const site = siteById(s.originSiteId);
  const destination = DEST[s.customerId];
  const country = customerById(s.customerId).country;
  return {
    id: s.id,
    reference: s.id,
    orderNumber: s.orderNumber,
    originSiteId: s.originSiteId,
    customerId: s.customerId,
    destination,
    international: country !== site.country,
    customsRequired: ["GB", "US"].includes(country),
    legs: s.legs,
    plannedDelivery: iso(s.plannedDeliveryH),
    documents: s.documents,
    goods: s.goods,
  };
};

// ---------------------------------------------------------------------------
// Story shipments: each one exercises a case the demo walks through.
// ---------------------------------------------------------------------------

/** Order 12345: road → sea → customs hold in Southampton (certificate of origin missing). */
const sh1042 = build({
  id: "SH-1042",
  orderNumber: "12345",
  originSiteId: "VLC",
  customerId: "KES",
  goods: "4 pallets · centrifugal pumps CP-200",
  legs: [
    leg("SH-1042-1", "road", "TLV", P.paterna, P.vlcPort, "TLV-88412", -240, -234),
    leg("SH-1042-2", "sea", "MTL", P.vlcPort, P.southampton, "MTLU4471023", -228, -36),
    leg("SH-1042-3", "road", "NFP", P.southampton, P.leeds, "NFP-UK-20931", 0, 20),
  ],
  plannedDeliveryH: 24,
  documents: docs(-250, "commercial_invoice", "packing_list", "bill_of_lading", "customs_declaration"),
});

/** Ocean leg to Houston with a carrier-revised ETA (+3 days); goes stale if the clock moves on. */
const sh1047 = build({
  id: "SH-1047",
  orderNumber: "12388",
  originSiteId: "ZAZ",
  customerId: "NBP",
  goods: "1×40' container · hydraulic manifolds",
  legs: [
    leg("SH-1047-1", "road", "TLV", P.zaragoza, P.vlcPort, "TLV-88501", -200, -192),
    leg("SH-1047-2", "sea", "MTL", P.vlcPort, P.houston, "MTLU4480317", -180, 216),
    leg("SH-1047-3", "road", "NFP", P.houston, P.houstonCity, "NFP-US-11872", 240, 252),
  ],
  plannedDeliveryH: 264,
  documents: docs(-210, "commercial_invoice", "packing_list", "bill_of_lading", "customs_declaration", "certificate_of_origin"),
});

/** France, road: silent since the Perpignan cross-dock; the operator confirms a 1-day delay later. */
const sh1051 = build({
  id: "SH-1051",
  orderNumber: "12402",
  originSiteId: "VLC",
  customerId: "DUR",
  goods: "2 pallets · pressure valves PV-40",
  legs: [leg("SH-1051-1", "road", "EUR", P.paterna, P.lyon, "ER-5521907", -30, 6)],
  plannedDeliveryH: 6,
  documents: docs(-34, "commercial_invoice", "packing_list", "cmr"),
});

/** Germany, road: out for delivery, delivered once the clock advances. */
const sh1055 = build({
  id: "SH-1055",
  orderNumber: "12410",
  originSiteId: "VLC",
  customerId: "BRE",
  goods: "6 pallets · gear pumps GP-12",
  legs: [leg("SH-1055-1", "road", "EUR", P.paterna, P.stuttgart, "ER-5522340", -50, 8)],
  plannedDeliveryH: 8,
  documents: docs(-54, "commercial_invoice", "packing_list", "cmr"),
});

/** Domestic, road + courier: failed delivery attempt (recipient absent). */
const sh1060 = build({
  id: "SH-1060",
  orderNumber: "12415",
  originSiteId: "ZAZ",
  customerId: "HNO",
  goods: "3 cartons · seal kits",
  legs: [
    leg("SH-1060-1", "road", "TLV", P.zaragoza, P.bilbaoHub, "TLV-88620", -30, -20),
    leg("SH-1060-2", "road", "RLM", P.bilbaoHub, P.bilbao, "RLM7730291", -6, -1),
  ],
  plannedDeliveryH: -1,
  documents: docs(-32, "commercial_invoice", "packing_list"),
});

/** Ocean, Houston: the carrier sent a status code nobody maps ("ROLL"); departure never confirmed. */
const sh1063 = build({
  id: "SH-1063",
  orderNumber: "12419",
  originSiteId: "VLC",
  customerId: "NBP",
  goods: "1×20' container · motor housings",
  legs: [
    leg("SH-1063-1", "road", "TLV", P.paterna, P.vlcPort, "TLV-88577", -120, -114),
    leg("SH-1063-2", "sea", "MTL", P.vlcPort, P.houston, "MTLU4483390", -96, 288),
    leg("SH-1063-3", "road", "NFP", P.houston, P.houstonCity, "NFP-US-11901", 300, 312),
  ],
  plannedDeliveryH: 324,
  documents: docs(-130, "commercial_invoice", "packing_list", "bill_of_lading", "customs_declaration", "certificate_of_origin"),
});

/** UK by road: customs cleared at Dover, reported by email and parsed by the AI layer. */
const sh1070 = build({
  id: "SH-1070",
  orderNumber: "12423",
  originSiteId: "ZAZ",
  customerId: "KES",
  goods: "5 pallets · spare impellers",
  legs: [
    leg("SH-1070-1", "road", "EUR", P.zaragoza, P.calais, "ER-5523011", -60, -22),
    leg("SH-1070-2", "road", "NFP", P.calais, P.leeds, "NFP-UK-20977", -18, 10),
  ],
  plannedDeliveryH: 10,
  documents: docs(-64, "commercial_invoice", "packing_list", "cmr", "customs_declaration", "certificate_of_origin"),
});

const storyEvents: RawEvent[] = [
  // SH-1042
  { kind: "levante", id: "tlv-1", ref: "TLV-88412", codigo: "RCG", ts: iso(-240), poblacion: "Paterna" },
  { kind: "levante", id: "tlv-2", ref: "TLV-88412", codigo: "ENT", ts: iso(-235), poblacion: "Valencia (puerto)" },
  { kind: "edi", id: "mtl-1", bl: "MTLU4471023", statusCode: "GTIN", dateTime: ediTime(-232), locode: "ESVLC" },
  { kind: "edi", id: "mtl-2", bl: "MTLU4471023", statusCode: "LOAD", dateTime: ediTime(-229), locode: "ESVLC" },
  { kind: "edi", id: "mtl-3", bl: "MTLU4471023", statusCode: "DEPA", dateTime: ediTime(-226), locode: "ESVLC", eta: ediDate(-36) },
  { kind: "edi", id: "mtl-4", bl: "MTLU4471023", statusCode: "ARRI", dateTime: ediTime(-40), locode: "GBSOU" },
  { kind: "edi", id: "mtl-5", bl: "MTLU4471023", statusCode: "DISC", dateTime: ediTime(-33), locode: "GBSOU" },
  {
    kind: "email",
    id: "nfp-1",
    from: "customs.uk@nordiafreight.example",
    receivedAt: iso(-28),
    subject: "File NFP-UK-20931 - import entry lodged",
    body: "Hello team,\nThe import entry for file NFP-UK-20931 (B/L MTLU4471023) has been lodged with HMRC at Southampton. We will revert once released.\nKind regards,\nNordia Customs Desk",
  },
  {
    kind: "email",
    id: "nfp-2",
    from: "customs.uk@nordiafreight.example",
    receivedAt: iso(-9),
    subject: "URGENT File NFP-UK-20931 - goods held by HMRC",
    body: "Hi,\nHMRC has placed file NFP-UK-20931 on hold at Southampton. They require the certificate of origin to apply the preferential tariff. Goods stay in the port until we receive it. Storage charges apply from day 3.\nPlease send the document asap.\nNordia Customs Desk",
  },

  // SH-1047
  { kind: "levante", id: "tlv-3", ref: "TLV-88501", codigo: "RCG", ts: iso(-200), poblacion: "Zaragoza" },
  { kind: "levante", id: "tlv-4", ref: "TLV-88501", codigo: "TRN", ts: iso(-197), poblacion: "Teruel" },
  { kind: "levante", id: "tlv-5", ref: "TLV-88501", codigo: "ENT", ts: iso(-193), poblacion: "Valencia (puerto)" },
  { kind: "edi", id: "mtl-6", bl: "MTLU4480317", statusCode: "GTIN", dateTime: ediTime(-190), locode: "ESVLC" },
  { kind: "edi", id: "mtl-7", bl: "MTLU4480317", statusCode: "LOAD", dateTime: ediTime(-184), locode: "ESVLC" },
  { kind: "edi", id: "mtl-8", bl: "MTLU4480317", statusCode: "DEPA", dateTime: ediTime(-178), locode: "ESVLC", eta: ediDate(216) },
  { kind: "edi", id: "mtl-9", bl: "MTLU4480317", statusCode: "ETAU", dateTime: ediTime(-40), locode: "PTSIE", eta: ediDate(288) },

  // SH-1051
  { kind: "euroroute", id: "eur-1", consignment: "ER-5521907", status: "Collected", time: euroTime(-30), place: "Paterna" },
  { kind: "euroroute", id: "eur-2", consignment: "ER-5521907", status: "On the road", time: euroTime(-26), place: "Castellón", eta: euroDate(6) },
  { kind: "euroroute", id: "eur-3", consignment: "ER-5521907", status: "At cross-dock", time: euroTime(-22), place: "Le Boulou (Perpignan)" },
  { kind: "euroroute", id: "eur-4", consignment: "ER-5521907", status: "On the road", time: euroTime(4), place: "Montpellier", eta: euroDate(30) },

  // SH-1055
  { kind: "euroroute", id: "eur-5", consignment: "ER-5522340", status: "Collected", time: euroTime(-50), place: "Paterna" },
  { kind: "euroroute", id: "eur-6", consignment: "ER-5522340", status: "On the road", time: euroTime(-46), place: "Tarragona", eta: euroDate(8) },
  { kind: "euroroute", id: "eur-7", consignment: "ER-5522340", status: "At cross-dock", time: euroTime(-20), place: "Mulhouse" },
  { kind: "euroroute", id: "eur-8", consignment: "ER-5522340", status: "Out for delivery", time: euroTime(-1), place: "Stuttgart" },
  { kind: "euroroute", id: "eur-9", consignment: "ER-5522340", status: "Delivered", time: euroTime(5), place: "Stuttgart" },

  // SH-1060
  { kind: "levante", id: "tlv-6", ref: "TLV-88620", codigo: "RCG", ts: iso(-30), poblacion: "Zaragoza" },
  { kind: "levante", id: "tlv-7", ref: "TLV-88620", codigo: "ENT", ts: iso(-21), poblacion: "Bilbao (plataforma RLM)" },
  { kind: "courier_api", id: "rlm-1", trackingNumber: "RLM7730291", status: "IN_DEPOT", datetime: iso(-18), city: "Bilbao" },
  { kind: "courier_api", id: "rlm-2", trackingNumber: "RLM7730291", status: "OUT_FOR_DELIVERY", datetime: iso(-5), city: "Bilbao" },
  {
    kind: "courier_api",
    id: "rlm-3",
    trackingNumber: "RLM7730291",
    status: "ATTEMPT_FAILED",
    datetime: iso(-2),
    city: "Bilbao",
    estimatedDelivery: isoDate(24),
  },

  // SH-1063
  { kind: "levante", id: "tlv-8", ref: "TLV-88577", codigo: "RCG", ts: iso(-120), poblacion: "Paterna" },
  { kind: "levante", id: "tlv-9", ref: "TLV-88577", codigo: "ENT", ts: iso(-115), poblacion: "Valencia (puerto)" },
  { kind: "edi", id: "mtl-10", bl: "MTLU4483390", statusCode: "GTIN", dateTime: ediTime(-110), locode: "ESVLC" },
  { kind: "edi", id: "mtl-11", bl: "MTLU4483390", statusCode: "ROLL", dateTime: ediTime(-90), locode: "ESVLC" },

  // SH-1070
  { kind: "euroroute", id: "eur-10", consignment: "ER-5523011", status: "Collected", time: euroTime(-60), place: "Zaragoza" },
  { kind: "euroroute", id: "eur-11", consignment: "ER-5523011", status: "On the road", time: euroTime(-56), place: "Lleida" },
  { kind: "euroroute", id: "eur-12", consignment: "ER-5523011", status: "At cross-dock", time: euroTime(-30), place: "Bordeaux" },
  { kind: "euroroute", id: "eur-13", consignment: "ER-5523011", status: "Delivered", time: euroTime(-22), place: "Calais" },
  {
    kind: "email",
    id: "nfp-3",
    from: "ops.channel@nordiafreight.example",
    receivedAt: iso(-15),
    subject: "Re: NFP-UK-20977 import entry Dover",
    body: "Morning,\nTrailer for file NFP-UK-20977 crossed on the 02:00 ferry. Import entry lodged at Dover.\nRegards, Nordia Ops",
  },
  {
    kind: "email",
    id: "nfp-4",
    from: "ops.channel@nordiafreight.example",
    receivedAt: iso(-6),
    subject: "NFP-UK-20977 cleared",
    body: `Good news: NFP-UK-20977 cleared customs at Dover this morning and the truck is en route to Leeds. ETA ${euroDate(10)}.\nNordia Ops`,
  },
  {
    kind: "email",
    id: "nfp-5",
    from: "ops.channel@nordiafreight.example",
    receivedAt: iso(9),
    subject: "NFP-UK-20977 POD",
    body: "Hi, file NFP-UK-20977 delivered to consignee in Leeds at 15:40, POD attached. Signed by A. Hart.\nNordia Ops",
  },
];

// ---------------------------------------------------------------------------
// Background portfolio: ordinary road shipments so the exceptions stand out.
// ---------------------------------------------------------------------------

type FillerState = "delivered" | "in_transit" | "planned";

interface Filler {
  n: number;
  site: string;
  customer: string;
  operator: "TLV" | "EUR";
  depH: number;
  durH: number;
  state: FillerState;
  goods: string;
}

const FILLERS: Filler[] = [
  { n: 1001, site: "VLC", customer: "DUR", operator: "EUR", depH: -150, durH: 40, state: "delivered", goods: "3 pallets · pressure valves PV-40" },
  { n: 1003, site: "ZAZ", customer: "HNO", operator: "TLV", depH: -130, durH: 10, state: "delivered", goods: "2 pallets · seal kits" },
  { n: 1008, site: "AVE", customer: "IBF", operator: "EUR", depH: -110, durH: 6, state: "delivered", goods: "8 pallets · cast pump bodies" },
  { n: 1012, site: "VLC", customer: "BRE", operator: "EUR", depH: -100, durH: 52, state: "delivered", goods: "4 pallets · gear pumps GP-12" },
  { n: 1019, site: "ZAZ", customer: "DUR", operator: "EUR", depH: -80, durH: 36, state: "delivered", goods: "1 pallet · spare parts" },
  { n: 1024, site: "VLC", customer: "HNO", operator: "TLV", depH: -60, durH: 9, state: "delivered", goods: "5 cartons · valve actuators" },
  { n: 1031, site: "AVE", customer: "HNO", operator: "TLV", depH: -40, durH: 14, state: "delivered", goods: "6 pallets · cast pump bodies" },
  { n: 1036, site: "ZAZ", customer: "IBF", operator: "TLV", depH: -26, durH: 6, state: "delivered", goods: "2 pallets · hydraulic hoses" },
  { n: 1064, site: "VLC", customer: "DUR", operator: "EUR", depH: -8, durH: 36, state: "in_transit", goods: "2 pallets · flow meters" },
  { n: 1067, site: "AVE", customer: "BRE", operator: "EUR", depH: -14, durH: 48, state: "in_transit", goods: "10 pallets · motor housings" },
  { n: 1068, site: "ZAZ", customer: "HNO", operator: "TLV", depH: -3, durH: 9, state: "in_transit", goods: "4 pallets · hydraulic hoses" },
  { n: 1072, site: "AVE", customer: "IBF", operator: "EUR", depH: -2, durH: 6, state: "in_transit", goods: "12 pallets · cast pump bodies" },
  { n: 1074, site: "VLC", customer: "BRE", operator: "EUR", depH: 20, durH: 50, state: "planned", goods: "3 pallets · gear pumps GP-12" },
  { n: 1075, site: "ZAZ", customer: "DUR", operator: "EUR", depH: 26, durH: 36, state: "planned", goods: "1 pallet · spare parts" },
  { n: 1077, site: "VLC", customer: "IBF", operator: "TLV", depH: 30, durH: 10, state: "planned", goods: "6 pallets · centrifugal pumps CP-200" },
  { n: 1078, site: "AVE", customer: "DUR", operator: "EUR", depH: 44, durH: 30, state: "planned", goods: "4 pallets · motor housings" },
];

const ORIGIN_PLACE: Record<string, Place> = { VLC: P.paterna, ZAZ: P.zaragoza, AVE: P.aveiro };

function filler(f: Filler): { shipment: Shipment; events: RawEvent[] } {
  const id = `SH-${f.n}`;
  const ref = f.operator === "TLV" ? `TLV-8${f.n}` : `ER-55${f.n}`;
  const from = ORIGIN_PLACE[f.site];
  const to = DEST[f.customer];
  const arrH = f.depH + f.durH;
  const shipment = build({
    id,
    orderNumber: String(11000 + f.n),
    originSiteId: f.site,
    customerId: f.customer,
    goods: f.goods,
    legs: [leg(`${id}-1`, "road", f.operator, from, to, ref, f.depH, arrH)],
    plannedDeliveryH: arrH,
    documents: docs(f.depH - 4, "commercial_invoice", "packing_list", "cmr"),
  });

  const pings = Array.from({ length: Math.floor((f.durH - 1) / 10) }, (_, i) => f.depH + 10 * (i + 1));
  const steps: [number, "pickup" | "transit" | "delivered"][] = [
    [f.depH, "pickup"],
    ...pings.map((h): [number, "transit"] => [h, "transit"]),
    [arrH, "delivered"],
  ];
  // In-transit fillers have their delivery in the future, so the clock reveals it; planned ones too.
  const events: RawEvent[] = steps.map(([h, step], i) =>
    f.operator === "TLV"
      ? {
          kind: "levante",
          id: `${id}-e${i}`,
          ref,
          codigo: { pickup: "RCG", transit: "TRN", delivered: "ENT" }[step],
          ts: iso(h),
          poblacion: step === "pickup" ? from.name : step === "delivered" ? to.name : "En ruta",
          fecha_prevista: step === "pickup" ? isoDate(arrH) : undefined,
        }
      : {
          kind: "euroroute",
          id: `${id}-e${i}`,
          consignment: ref,
          status: { pickup: "Collected", transit: "On the road", delivered: "Delivered" }[step],
          time: euroTime(h),
          place: step === "pickup" ? from.name : step === "delivered" ? to.name : "En route",
          eta: step === "pickup" ? euroDate(arrH) : undefined,
        },
  );
  return { shipment, events };
}

const fillers = FILLERS.map(filler);

export const SHIPMENTS: Shipment[] = [sh1042, sh1047, sh1051, sh1055, sh1060, sh1063, sh1070, ...fillers.map((f) => f.shipment)];

export const RAW_EVENTS: RawEvent[] = [...storyEvents, ...fillers.flatMap((f) => f.events)];
