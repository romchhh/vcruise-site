import { unstable_cache } from "next/cache";
import { buildSearchParams } from "./params";
import { loadClientCruises } from "./load-cruises";
import { matchesCruiseRegion } from "./region-match";
import { cheapestPrice, hasBookableDates } from "./utils";
import type { CruiseRecord } from "./types";
import type { UniqueRoute } from "@/types";

/**
 * Підбір карток «Унікальні маршрути».
 * Пізніше можна замінити на фіксований список від менеджера
 * (наприклад, data/unique-routes-curation.json з cruise key / liner_slug).
 */
export const UNIQUE_ROUTES_COUNT = 6;
export const UNIQUE_ROUTE_COVER_IMAGE = "/images/sections/unique-routes-cover.jpg";

const MEDITERRANEAN = "Середземномор'я";

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

function formatClassicTitle(route: string[]) {
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

function resolveLinerImage(cruise: CruiseRecord): string | null {
  const logo = cruise.liner_logo?.trim();
  if (!logo) return null;
  if (logo.startsWith("http") || logo.startsWith("/")) return logo;
  return null;
}

function scoreRoute(cruise: CruiseRecord, today: string): number | null {
  if (!hasBookableDates(cruise, today)) return null;

  const startDate = nearestUpcomingDate(cruise, today);
  const price =
    cheapestPrice(cruise, "USD") ??
    cheapestPrice(cruise, "EUR") ??
    cheapestPrice(cruise, "NAT");

  if (!startDate || price == null) return null;

  const nights = Math.max(cruise.nights, 1);
  const ports = routePorts(cruise.route ?? []).length;
  let score = nights;

  if (matchesCruiseRegion(cruise, MEDITERRANEAN)) score += 24;
  if (nights >= 7) score += 12;
  else if (nights >= 5) score += 6;
  if (ports >= 4) score += 4;
  if (resolveLinerImage(cruise)) score += 8;

  return score;
}

function mapToUniqueRoute(
  cruise: CruiseRecord,
  startDate: string,
  price: number
): UniqueRoute {
  const region = cruise.region_name || MEDITERRANEAN;
  const nights = Math.max(cruise.nights, 1);
  const route = cruise.route ?? [];

  const searchUrl = `/search?${buildSearchParams({
    regions: [region],
    company: cruise.cruise_title,
    liner: cruise.liner_slug,
    dateFrom: startDate,
    sort: "date_asc",
    currency: "USD",
    newLinersOnly: false,
  })}`;

  const linerImage = resolveLinerImage(cruise);

  return {
    id: String(cruise.key),
    region,
    line: cruise.cruise_title,
    title: formatClassicTitle(route),
    route: formatRoute(route),
    dateRange: formatDateRange(startDate, nights),
    nights,
    price,
    coverImage: UNIQUE_ROUTE_COVER_IMAGE,
    linerImage,
    href: searchUrl,
  };
}

export function pickUniqueRoutes(
  cruises: CruiseRecord[],
  referenceDate = todayIso()
): UniqueRoute[] {
  const ranked = cruises
    .map((cruise) => {
      const score = scoreRoute(cruise, referenceDate);
      if (score == null) return null;

      const startDate = nearestUpcomingDate(cruise, referenceDate)!;
      const price =
        cheapestPrice(cruise, "USD") ??
        cheapestPrice(cruise, "EUR") ??
        cheapestPrice(cruise, "NAT")!;

      return { cruise, score, startDate, price };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.score - a.score);

  const seenLiners = new Set<string>();
  const seenCompanies = new Set<string>();
  const picked: UniqueRoute[] = [];

  const tryPick = (item: (typeof ranked)[number], requireNewCompany: boolean) => {
    const linerKey = item.cruise.liner_slug || String(item.cruise.key);
    if (seenLiners.has(linerKey)) return false;
    if (requireNewCompany && seenCompanies.has(item.cruise.cruise_title)) {
      return false;
    }

    seenLiners.add(linerKey);
    seenCompanies.add(item.cruise.cruise_title);
    picked.push(mapToUniqueRoute(item.cruise, item.startDate, item.price));
    return true;
  };

  for (const item of ranked) {
    if (picked.length >= UNIQUE_ROUTES_COUNT) break;
    tryPick(item, true);
  }

  for (const item of ranked) {
    if (picked.length >= UNIQUE_ROUTES_COUNT) break;
    tryPick(item, false);
  }

  return picked;
}

async function loadUniqueRoutesUncached() {
  const cruises = loadClientCruises();
  return pickUniqueRoutes(cruises);
}

export const getUniqueRoutes = unstable_cache(
  loadUniqueRoutesUncached,
  ["unique-routes-v1"],
  { revalidate: 3600 }
);
