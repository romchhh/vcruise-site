import { unstable_cache } from "next/cache";
import { buildSearchParams } from "./params";
import { matchesCruiseRegion } from "./region-match";
import { loadClientCruises } from "./load-cruises";
import { cheapestPrice, hasBookableDates } from "./utils";
import type { CruiseRecord } from "./types";
import type { Cruise } from "@/types";

/** Топ-6 компаній — по одній картці на кожну. */
export const NEAREST_CRUISE_COMPANIES = [
  "MSC Cruises",
  "Royal Caribbean International",
  "Norwegian Cruise Line",
  "Costa Cruises",
  "Princess Cruises",
  "Celebrity Cruises",
] as const;

export type NearestCruiseSlot = {
  company: string;
  /** Пошуковий регіон, напр. «Середземномор'я». */
  region: string;
};

export const NEAREST_CRUISE_SLOTS: NearestCruiseSlot[] =
  NEAREST_CRUISE_COMPANIES.map((company) => ({
    company,
    region: "Середземномор'я",
  }));

const DEFAULT_IMAGE = "/images/cruise-card.jpg";
const MAX_LOOKAHEAD_DAYS = 120;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateShort(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year.slice(2)}`;
}

function formatDateRange(startIso: string, nights: number) {
  const endIso = addDays(startIso, nights);
  return `${formatDateShort(startIso)} – ${formatDateShort(endIso)}`;
}

function formatRoute(route: string[]) {
  if (!route.length) return "—";
  if (route.length === 1) return route[0];
  const first = route[0].split(",")[0]?.trim() ?? route[0];
  const last = route[route.length - 1].split(",")[0]?.trim() ?? route.at(-1)!;
  return `${first} → ${last}`;
}

function buildTitle(cruise: CruiseRecord) {
  const ports = (cruise.route ?? [])
    .map((port) => port.split(",")[0]?.trim())
    .filter(Boolean);

  if (ports.length >= 2) {
    return `${ports[0]} — ${ports[ports.length - 1]}`;
  }

  return cruise.liner_name || cruise.cruise_title;
}

function upcomingDates(cruise: CruiseRecord, today: string) {
  const dates = (cruise.available_dates ?? [])
    .map((item) => item.date)
    .filter((date) => date && date >= today)
    .sort();

  if (dates.length) return dates;

  if (cruise.base_date_start && cruise.base_date_start >= today) {
    return [cruise.base_date_start];
  }

  return [];
}

function nearestUpcomingDate(cruise: CruiseRecord, today: string) {
  return upcomingDates(cruise, today)[0] ?? null;
}

function bookingUrlForDate(cruise: CruiseRecord, date: string) {
  return (
    cruise.available_dates?.find((item) => item.date === date)?.booking_url ??
    null
  );
}

function pickBestCruiseForSlot(
  cruises: CruiseRecord[],
  slot: NearestCruiseSlot,
  today: string
) {
  const companyCruises = cruises.filter(
    (cruise) =>
      cruise.cruise_title === slot.company && hasBookableDates(cruise)
  );

  if (!companyCruises.length) return null;

  const inRegion = companyCruises.filter((cruise) =>
    matchesCruiseRegion(cruise, slot.region)
  );

  const maxDate = addDays(today, MAX_LOOKAHEAD_DAYS);

  const pickFromPool = (pool: CruiseRecord[]) => {
    let best: { cruise: CruiseRecord; date: string } | null = null;

    for (const cruise of pool) {
      const date = nearestUpcomingDate(cruise, today);
      if (!date) continue;

      if (!best || date < best.date) {
        best = { cruise, date };
      }
    }

    if (best && best.date <= maxDate) return best;

    if (best) return best;

    return null;
  };

  return pickFromPool(inRegion) ?? pickFromPool(companyCruises);
}

function mapToCard(
  slot: NearestCruiseSlot,
  cruise: CruiseRecord,
  startDate: string
): Cruise {
  const price =
    cheapestPrice(cruise, "USD") ??
    cheapestPrice(cruise, "NAT") ??
    cheapestPrice(cruise, "EUR") ??
    0;

  const bookingUrl = bookingUrlForDate(cruise, startDate);
  const searchUrl = `/search?${buildSearchParams({
    regions: [slot.region],
    company: slot.company,
    dateFrom: startDate,
    sort: "date_asc",
    currency: "USD",
    newLinersOnly: false,
  })}`;

  const image =
    cruise.liner_logo?.startsWith("http") || cruise.liner_logo?.startsWith("/")
      ? cruise.liner_logo
      : DEFAULT_IMAGE;

  return {
    id: String(cruise.key),
    region: slot.region,
    line: cruise.cruise_title,
    title: buildTitle(cruise),
    route: formatRoute(cruise.route ?? []),
    dateRange: formatDateRange(startDate, cruise.nights),
    nights: cruise.nights,
    price,
    image,
    href: bookingUrl ?? searchUrl,
  };
}

export function pickNearestCruises(
  cruises: CruiseRecord[],
  slots: NearestCruiseSlot[] = NEAREST_CRUISE_SLOTS,
  referenceDate = todayIso()
): Cruise[] {
  const usedCompanies = new Set<string>();
  const results: Cruise[] = [];

  for (const slot of slots) {
    const match = pickBestCruiseForSlot(cruises, slot, referenceDate);
    if (!match) continue;

    usedCompanies.add(slot.company);
    results.push(mapToCard(slot, match.cruise, match.date));
  }

  if (results.length >= slots.length) {
    return results;
  }

  const fallbackCompanies = NEAREST_CRUISE_COMPANIES.filter(
    (company) => !usedCompanies.has(company)
  );

  for (const company of fallbackCompanies) {
    if (results.length >= slots.length) break;

    const slot = { company, region: slots[0]?.region ?? "Середземномор'я" };
    const match = pickBestCruiseForSlot(cruises, slot, referenceDate);
    if (!match) continue;

    usedCompanies.add(company);
    results.push(mapToCard(slot, match.cruise, match.date));
  }

  return results;
}

async function loadNearestCruisesUncached() {
  const cruises = loadClientCruises();
  return pickNearestCruises(cruises);
}

/** Кеш 1 год — дати оновлюються автоматично відносно «сьогодні». */
export const getNearestCruises = unstable_cache(
  loadNearestCruisesUncached,
  ["nearest-cruises-v1"],
  { revalidate: 3600 }
);
