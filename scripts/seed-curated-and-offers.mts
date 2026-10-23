/**
 * Seed CMS hot-deals / unique-routes with new card fields,
 * and attach sample offers[] to a few Orchestra sailings for structure testing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadClientCruises } from "../lib/cruise-search/load-cruises";
import { pickHotDeals } from "../lib/cruise-search/hot-deals";
import { pickUniqueRoutes } from "../lib/cruise-search/unique-routes";
import {
  addDaysIso,
  nearestDate,
} from "../lib/cruise-search/utils";
import {
  curatedCardFromPick,
  resolveHotDeals,
  resolveUniqueRoutes,
} from "../lib/cms/curated-cruise-cards";
import { updateDb } from "../lib/cms/store";
import { formatContactTelegramMessage } from "../lib/contact/format-message";
import { parseContactRequest } from "../lib/contact/parse-contact-request";

const cruises = loadClientCruises();

const hotItems = pickHotDeals(cruises).map((deal, index) => {
  const match = cruises.find((c) => String(c.key) === deal.id)!;
  return {
    ...curatedCardFromPick("hot-deals", {
      id: `hot-${deal.id}`,
      company: match.cruise_title,
      liner: match.liner_slug,
      date: nearestDate(match) || "",
    }),
    title: index === 0 ? `Гаряча пропозиція: ${match.liner_name}` : "",
    priceBasis: (index % 3 === 1 ? "couple" : "person") as "couple" | "person",
    discountPercent: deal.discountPercent,
    image: deal.image,
  };
});

const uniqueItems = pickUniqueRoutes(cruises).map((route, index) => {
  const match = cruises.find((c) => String(c.key) === route.id)!;
  return {
    ...curatedCardFromPick("unique-routes", {
      id: `uniq-${route.id}`,
      company: match.cruise_title,
      liner: match.liner_slug,
      date: nearestDate(match) || "",
    }),
    title: index === 0 ? `Флагманський маршрут: ${route.title}` : "",
    priceBasis: (index === 2 ? "couple" : "person") as "couple" | "person",
    coverImage: route.coverImage,
    linerImage: route.linerImage ?? "",
  };
});

updateDb((db) => {
  const hot = db.blocks.find((b) => b.key === "hot-deals");
  const uniq = db.blocks.find((b) => b.key === "unique-routes");
  if (hot) hot.items = hotItems;
  if (uniq) uniq.items = uniqueItems;
});

console.log("CMS seeded hot=%d unique=%d", hotItems.length, uniqueItems.length);

const resolvedHot = resolveHotDeals(
  { items: hotItems } as never,
  [],
  cruises,
);
const resolvedUniq = resolveUniqueRoutes(
  { items: uniqueItems } as never,
  [],
  cruises,
);

const hotOk = resolvedHot.every(
  (d) =>
    Boolean(d.linerName) &&
    d.href.includes("cruise=") &&
    d.href.includes("dateTo="),
);
const uniqOk = resolvedUniq.every(
  (d) => Boolean(d.linerName) && d.href.includes("cruise="),
);
console.log("resolve hot ok:", hotOk, "count", resolvedHot.length);
console.log("resolve unique ok:", uniqOk, "count", resolvedUniq.length);
console.log(
  "sample titles:",
  resolvedHot[0]?.title,
  "|",
  resolvedUniq[0]?.title,
);

const jsonPath = path.join(
  process.cwd(),
  "data/cruise-search/cruises_output.json",
);
const data = JSON.parse(readFileSync(jsonPath, "utf8")) as Array<{
  key: number;
  liner_name?: string;
  cruise_title?: string;
  region_name?: string;
  route?: string[];
  nights?: number;
  ship_built_year?: number;
  ship_renovated_year?: number;
  ship_class?: string;
  company_class?: string;
  ship_size?: string;
  available_dates?: Array<{
    date?: string;
    booking_url?: string;
    cabins?: Record<string, { NAT?: number; USD?: number; EUR?: number }>;
    offers?: unknown[];
  }>;
}>;

function sampleOffersFor(
  cabins: Record<string, { NAT?: number; USD?: number; EUR?: number }>,
) {
  const interior = cabins["Внутрішня"];
  const ocean = cabins["З вікном"];
  const balcony = cabins["З балконом"];
  const offers = [];
  if (interior) {
    offers.push(
      {
        cabinCode: "IR1",
        cabinName: "Внутрішня Deluxe Fantastica (IR1)",
        cabinCategory: "Внутрішня",
        tariffName: "BEST PRICE",
        areaM2: 14,
        decks: "5 - 11",
        price: { ...interior },
      },
      {
        cabinCode: "IR1",
        cabinName: "Внутрішня Deluxe Fantastica (IR1)",
        cabinCategory: "Внутрішня",
        tariffName: "FREE UPGRADE",
        areaM2: 14,
        decks: "5 - 11",
        price: {
          NAT: Math.round((interior.NAT || 0) * 1.19),
          USD: Math.round((interior.USD || 0) * 1.19),
          EUR: Math.round((interior.EUR || 0) * 1.19),
        },
      },
    );
  }
  if (ocean) {
    offers.push({
      cabinCode: "OR1",
      cabinName: "З вікном Deluxe Fantastica (OR1)",
      cabinCategory: "З вікном",
      tariffName: "BEST PRICE",
      areaM2: 16,
      decks: "5 - 11",
      price: { ...ocean },
    });
  }
  if (balcony) {
    offers.push({
      cabinCode: "BR1",
      cabinName: "З балконом Fantastica (BR1)",
      cabinCategory: "З балконом",
      tariffName: "BEST PRICE DRINKS",
      areaM2: 16,
      decks: "8 - 12",
      price: {
        NAT: Math.round((balcony.NAT || 0) * 1.35),
        USD: Math.round((balcony.USD || 0) * 1.35),
        EUR: Math.round((balcony.EUR || 0) * 1.35),
      },
    });
  }
  return offers;
}

const keysToPatch = [4198, 4199, 4200];
let patched = 0;
for (const key of keysToPatch) {
  const cruise = data.find((c) => c.key === key);
  if (!cruise?.available_dates) continue;
  for (const entry of cruise.available_dates) {
    if (entry.date === "2027-01-02" && entry.cabins) {
      entry.offers = sampleOffersFor(entry.cabins);
      patched += 1;
    }
  }
}

writeFileSync(jsonPath, JSON.stringify(data));
console.log("Patched offers[] sailings:", patched);

const c = data.find((x) => x.key === 4198)!;
const entry = c.available_dates!.find((d) => d.date === "2027-01-02")!;
const parsed = parseContactRequest({
  name: "Тест Менеджер",
  phone: "+380 50 111 22 33",
  booking: {
    linerName: c.liner_name,
    company: c.cruise_title,
    region: c.region_name,
    route: (c.route || []).join(" · "),
    nights: c.nights || 7,
    cruiseDate: "2027-01-02",
    cruiseDateEnd: addDaysIso("2027-01-02", c.nights || 7),
    cabinType: "Внутрішня",
    priceLabel: "998 €",
    adults: 2,
    children: 1,
    shipBuiltYear: c.ship_built_year,
    shipRenovatedYear: c.ship_renovated_year,
    shipClass: c.ship_class,
    companyClass: c.company_class,
    shipSize: c.ship_size,
    bookingUrl: entry.booking_url,
  },
});

console.log(
  "bookingUrl in parse:",
  parsed.ok ? parsed.payload.booking?.bookingUrl : parsed,
);
console.log("offers on 4198:", entry.offers?.length);
if (parsed.ok) {
  console.log(
    formatContactTelegramMessage(parsed.payload)
      .split("\n")
      .slice(0, 16)
      .join("\n"),
  );
}