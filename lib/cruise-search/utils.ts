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

export function nearestDate(cruise: CruiseRecord) {
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

export function getSearchBounds(cruises: CruiseRecord[]) {
  const nights = cruises.map((cruise) => cruise.nights).filter((n) => n > 0);
  const prices = cruises
    .map((cruise) => cheapestPrice(cruise, "NAT"))
    .filter((price): price is number => price != null);

  return {
    durMin: nights.length ? Math.min(...nights) : 1,
    durMax: nights.length ? Math.max(...nights) : 30,
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 100000,
  };
}
