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

export function cheapestPrice(
  cruise: CruiseRecord,
  currency: CurrencyCode = "NAT"
) {
  const cabins = cruise.from_price ?? {};
  let min: number | null = null;

  for (const cabin of Object.values(cabins)) {
    const value = cabin?.[currency];
    if (value != null && (min === null || value < min)) {
      min = value;
    }
  }

  return min;
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

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p)),
  );
  return sorted[index]!;
}

export function getSearchBounds(
  cruises: CruiseRecord[],
  currency: CurrencyCode = "NAT",
) {
  const nights = cruises.map((cruise) => cruise.nights).filter((n) => n > 0);
  const prices = cruises
    .map((cruise) => cheapestPrice(cruise, currency))
    .filter((price): price is number => price != null)
    .sort((left, right) => left - right);

  // Ignore extreme outliers so the budget slider stays usable.
  const priceMin = prices.length ? Math.floor(prices[0]!) : 0;
  const priceMax = prices.length
    ? Math.ceil(Math.max(percentile(prices, 0.98), priceMin + 1))
    : 100_000;

  return {
    durMin: nights.length ? Math.min(...nights) : 1,
    durMax: nights.length ? Math.max(...nights) : 30,
    priceMin,
    priceMax,
  };
}
