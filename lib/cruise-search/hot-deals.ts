import { unstable_cache } from "next/cache";
import { buildSearchParams } from "./params";
import { loadClientCruises } from "./load-cruises";
import { cheapestPrice, hasBookableDates } from "./utils";
import type { CruiseRecord } from "./types";
import type { HotDeal } from "@/types";

import {
  HOT_DEAL_COVER_IMAGE,
  HOT_DEAL_DISCOUNT_PERCENT as SHARED_HOT_DEAL_DISCOUNT,
} from "@/lib/cms/section-card-shared";

export const HOT_DEALS_COUNT = 6;
export const HOT_DEAL_DISCOUNT_PERCENT = SHARED_HOT_DEAL_DISCOUNT;
const HOT_DEAL_IMAGE = HOT_DEAL_COVER_IMAGE;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateShort(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year.slice(2)}`;
}

function formatDateRange(startIso: string, nights: number) {
  const endIso = addDays(startIso, nights);
  return `${formatDateShort(startIso)} – ${formatDateShort(endIso)}`;
}

function routePorts(route: string[]) {
  return route
    .map((port) => port.split(",")[0]?.trim())
    .filter(
      (port) =>
        port &&
        port !== "В морі" &&
        !port.startsWith("...") &&
        !port.startsWith("…")
    );
}

function formatRoute(route: string[]) {
  const ports = routePorts(route);
  if (!ports.length) return "—";
  if (ports.length === 1) return ports[0];
  return `${ports[0]} → ${ports[ports.length - 1]}`;
}

function formatTitle(route: string[]) {
  const ports = routePorts(route);
  if (ports.length >= 2) {
    return `Класичний круїз: ${ports[0]} — ${ports[ports.length - 1]}`;
  }
  if (ports.length === 1) {
    return `Класичний круїз: ${ports[0]}`;
  }
  return "Класичний круїз";
}

function nearestUpcomingDate(cruise: CruiseRecord, today: string) {
  const dates = (cruise.available_dates ?? [])
    .map((item) => item.date)
    .filter((date) => date && date >= today)
    .sort();

  if (dates.length) return dates[0]!;

  if (cruise.base_date_start && cruise.base_date_start >= today) {
    return cruise.base_date_start;
  }

  return null;
}

function originalPriceFromDeal(price: number, discountPercent: number) {
  const factor = 1 - discountPercent / 100;
  if (factor <= 0) return price;
  return Math.round(price / factor);
}

function resolveLinerImage(cruise: CruiseRecord): string {
  const logo = cruise.liner_logo?.trim();
  if (logo && (logo.startsWith("http") || logo.startsWith("/"))) {
    return logo;
  }
  return HOT_DEAL_IMAGE;
}

function mapToHotDeal(
  cruise: CruiseRecord,
  startDate: string,
  price: number
): HotDeal {
  const region = cruise.region_name || "Середземномор'я";
  const searchUrl = `/search?${buildSearchParams({
    regions: [region],
    company: cruise.cruise_title,
    liner: cruise.liner_slug,
    dateFrom: startDate,
    sort: "price_asc",
    currency: "USD",
    newLinersOnly: false,
  })}`;

  const route = cruise.route ?? [];
  const nights = Math.max(cruise.nights, 1);

  return {
    id: String(cruise.key),
    title: formatTitle(route),
    route: formatRoute(route),
    dateRange: formatDateRange(startDate, nights),
    nights,
    price,
    originalPrice: originalPriceFromDeal(price, HOT_DEAL_DISCOUNT_PERCENT),
    discountPercent: HOT_DEAL_DISCOUNT_PERCENT,
    image: resolveLinerImage(cruise),
    href: searchUrl,
  };
}

export function pickHotDeals(
  cruises: CruiseRecord[],
  referenceDate = todayIso()
): HotDeal[] {
  const ranked = cruises
    .filter((cruise) => hasBookableDates(cruise, referenceDate))
    .map((cruise) => {
      const price =
        cheapestPrice(cruise, "USD") ??
        cheapestPrice(cruise, "EUR") ??
        cheapestPrice(cruise, "NAT");

      const startDate = nearestUpcomingDate(cruise, referenceDate);

      if (price == null || !startDate) return null;

      return { cruise, price, startDate };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.price - right.price);

  const seenLiners = new Set<string>();
  const deals: HotDeal[] = [];

  for (const item of ranked) {
    const linerKey = item.cruise.liner_slug || String(item.cruise.key);
    if (seenLiners.has(linerKey)) continue;

    seenLiners.add(linerKey);
    deals.push(mapToHotDeal(item.cruise, item.startDate, item.price));

    if (deals.length >= HOT_DEALS_COUNT) break;
  }

  return deals;
}

async function loadHotDealsUncached() {
  const cruises = loadClientCruises();
  return pickHotDeals(cruises);
}

export const getHotDeals = unstable_cache(
  loadHotDealsUncached,
  ["hot-deals-v3"],
  { revalidate: 3600 }
);
