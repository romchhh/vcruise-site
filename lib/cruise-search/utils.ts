import { CABIN_ORDER } from "./constants";
import type { CruiseRecord, CurrencyCode } from "./types";

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Math.round(value)
    .toLocaleString("uk-UA")
    .replace(/,/g, " ");
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** Add calendar days to an ISO date (YYYY-MM-DD), UTC-safe. */
export function addDaysIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** e.g. «02.01.2027 – 09.01.2027 · 7 ночей» */
export function formatSailingDateRange(startIso: string, nights: number) {
  const safeNights = Math.max(nights, 1);
  const endIso = addDaysIso(startIso, safeNights);
  return `${formatDate(startIso)} – ${formatDate(endIso)} · ${safeNights} ночей`;
}

function cheapestFromCabins(
  cabins: CruiseRecord["from_price"] | undefined,
  currency: CurrencyCode,
) {
  if (!cabins) return null;
  let min: number | null = null;

  for (const cabin of Object.values(cabins)) {
    const value = cabin?.[currency];
    if (value != null && (min === null || value < min)) {
      min = value;
    }
  }

  return min;
}

export function cheapestPrice(
  cruise: CruiseRecord,
  currency: CurrencyCode = "NAT"
) {
  return cheapestFromCabins(cruise.from_price, currency);
}

/** Cheapest cabin price for a specific sailing date, else cruise-level from_price. */
export function cheapestPriceOnDate(
  cruise: CruiseRecord,
  date: string | null | undefined,
  currency: CurrencyCode = "NAT",
) {
  if (date) {
    const entry = (cruise.available_dates ?? []).find(
      (item) => item.date === date,
    );
    const fromDate = cheapestFromCabins(entry?.cabins, currency);
    if (fromDate != null) return fromDate;
  }
  return cheapestPrice(cruise, currency);
}

export function embarkationPort(cruise: CruiseRecord) {
  const ports = (cruise.route ?? [])
    .map((port) => port.split(",")[0]?.trim())
    .filter(
      (port) =>
        port &&
        port !== "В морі" &&
        !port.startsWith("...") &&
        !port.startsWith("…"),
    );
  return ports[0] || "";
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getUpcomingDates(
  cruise: CruiseRecord,
  referenceDate = todayIso()
) {
  return (cruise.available_dates ?? [])
    .filter((item) => item.date && item.date >= referenceDate)
    .slice()
    .sort((left, right) => left.date!.localeCompare(right.date!));
}

export function hasBookableDates(
  cruise: CruiseRecord,
  referenceDate = todayIso()
) {
  return getUpcomingDates(cruise, referenceDate).length > 0;
}

export function nearestDate(cruise: CruiseRecord, referenceDate = todayIso()) {
  const upcoming = getUpcomingDates(cruise, referenceDate);
  if (upcoming.length) return upcoming[0]?.date ?? null;

  const dates = (cruise.available_dates ?? [])
    .map((item) => item.date)
    .filter(Boolean)
    .sort();

  if (!dates.length) return cruise.base_date_start ?? null;
  return dates[0] ?? null;
}

/** First sailing date that falls inside an optional date filter. */
export function sailingDateInFilter(
  cruise: CruiseRecord,
  dateFrom = "",
  dateTo = "",
  referenceDate = todayIso(),
) {
  const upcoming = getUpcomingDates(cruise, referenceDate);
  if (!dateFrom && !dateTo) return upcoming[0]?.date ?? null;

  const matched = upcoming.filter((item) => {
    const date = item.date!;
    if (dateFrom && !dateTo) return date === dateFrom;
    if (!dateFrom && dateTo) return date <= dateTo;
    return date >= dateFrom && date <= dateTo;
  });

  return matched[0]?.date ?? null;
}

export function cabinPriceLadder(
  cruise: CruiseRecord,
  currency: CurrencyCode = "NAT"
) {
  return CABIN_ORDER
    .filter((cabin) => cruise.from_price?.[cabin]?.[currency] != null)
    .map((cabin) => ({
      cabin,
      price: cruise.from_price![cabin]![currency]!,
    }));
}

export function getDurationBounds(durationLabel: string) {
  switch (durationLabel) {
    case "1-7 ночей":
      return { min: 1, max: 7 };
    case "8-14 ночей":
      return { min: 8, max: 14 };
    case "15-21 ночей":
      return { min: 15, max: 21 };
    case "22+ ночей":
      return { min: 22, max: 365 };
    default:
      return null;
  }
}

export function getSearchBounds(
  cruises: CruiseRecord[],
  currency: CurrencyCode = "NAT",
) {
  const nights = cruises.map((cruise) => cruise.nights).filter((n) => n > 0);
  const prices = cruises
    .map((cruise) => cheapestPrice(cruise, currency))
    .filter((price): price is number => price != null);

  const priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const priceMax = prices.length
    ? Math.ceil(Math.max(Math.max(...prices), priceMin + 1))
    : 100_000;

  return {
    durMin: nights.length ? Math.min(...nights) : 1,
    durMax: nights.length ? Math.max(...nights) : 30,
    priceMin,
    priceMax,
  };
}
