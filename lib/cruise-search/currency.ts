import {
  CURRENCY_FALLBACK_ORDER,
  DEFAULT_CURRENCY,
} from "./constants";
import { cheapestPriceOnDate } from "./utils";
import type { CruiseRecord, CurrencyCode } from "./types";

export function parseCurrencyCode(
  raw: string | undefined | null,
): CurrencyCode {
  if (raw === "NAT" || raw === "USD" || raw === "EUR") return raw;
  return DEFAULT_CURRENCY;
}

export function catalogPricesForDate(
  cruise: CruiseRecord,
  date: string | null | undefined,
): Partial<Record<CurrencyCode, number>> {
  const prices: Partial<Record<CurrencyCode, number>> = {};
  for (const code of CURRENCY_FALLBACK_ORDER) {
    const amount = cheapestPriceOnDate(cruise, date, code);
    if (amount != null && amount > 0) prices[code] = amount;
  }
  return prices;
}

export function pickPrimaryCatalogPrice(
  prices: Partial<Record<CurrencyCode, number>>,
): number | null {
  for (const code of CURRENCY_FALLBACK_ORDER) {
    const amount = prices[code];
    if (amount != null && amount > 0) return amount;
  }
  return null;
}

export function priceInCurrency(
  prices: Partial<Record<CurrencyCode, number>> | undefined,
  currency: CurrencyCode,
  fallback = 0,
): number {
  const amount = prices?.[currency];
  if (amount != null && amount > 0) return amount;
  const primary = prices ? pickPrimaryCatalogPrice(prices) : null;
  return primary ?? fallback;
}
