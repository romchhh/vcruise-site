import type { CurrencyCode } from "./types";

export type CruiseDetailQuery = {
  from: string;
  sailing: string;
  currency: CurrencyCode;
  adults: number;
  children: number;
  infants: number;
};

export function buildSearchHrefFromListQuery(listQuery: string) {
  const trimmed = listQuery.trim();
  return trimmed ? `/search?${trimmed}` : "/search";
}

export function buildCruiseDetailPath(
  cruiseKey: number,
  options: {
    listQuery?: string;
    sailing?: string;
    currency?: CurrencyCode;
    adults?: number;
    children?: number;
    infants?: number;
  } = {},
) {
  const params = new URLSearchParams();
  const from = options.listQuery?.trim();
  if (from) params.set("from", from);
  if (options.sailing) params.set("sailing", options.sailing);
  if (options.currency && options.currency !== "NAT") {
    params.set("currency", options.currency);
  }
  if (options.adults && options.adults > 0) {
    params.set("adults", String(options.adults));
  }
  if (options.children && options.children > 0) {
    params.set("children", String(options.children));
  }
  if (options.infants && options.infants > 0) {
    params.set("infants", String(options.infants));
  }

  const query = params.toString();
  return query
    ? `/search/cruise/${cruiseKey}?${query}`
    : `/search/cruise/${cruiseKey}`;
}

export function parseCruiseDetailQuery(
  params: Record<string, string | string[] | undefined>,
): CruiseDetailQuery {
  const pick = (key: string) => {
    const value = params[key];
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  };

  const currencyRaw = pick("currency");
  const currency: CurrencyCode =
    currencyRaw === "USD" || currencyRaw === "EUR" ? currencyRaw : "NAT";

  const adults = Number.parseInt(pick("adults"), 10);
  const children = Number.parseInt(pick("children"), 10);
  const infants = Number.parseInt(pick("infants"), 10);

  return {
    from: pick("from"),
    sailing: pick("sailing"),
    currency,
    adults: Number.isFinite(adults) && adults > 0 ? adults : 2,
    children: Number.isFinite(children) && children >= 0 ? children : 0,
    infants: Number.isFinite(infants) && infants >= 0 ? infants : 0,
  };
}
