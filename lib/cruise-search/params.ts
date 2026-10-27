import {
  DEFAULT_CURRENCY,
  HERO_DURATION_OPTIONS,
  MONTH_LABELS,
} from "./constants";
import { parseCurrencyCode } from "./currency";
import { sanitizeSelectedMonths } from "./month-helpers";
import { getSearchBounds } from "./utils";
import type {
  CruiseRecord,
  CruiseSearchFilters,
  CruiseSort,
  CurrencyCode,
} from "./types";

function parseList(value: string | string[] | undefined) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(
  value: string | string[] | undefined,
  fallback: number
) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createDefaultFilters(
  cruises: CruiseRecord[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
): CruiseSearchFilters {
  const bounds = getSearchBounds(cruises, currency);

  return {
    regions: [],
    company: "",
    liner: "",
    year: "Будь-коли",
    months: [],
    duration: "Будь-яка",
    dateFrom: "",
    dateTo: "",
    durMin: bounds.durMin,
    durMax: bounds.durMax,
    priceMin: bounds.priceMin,
    priceMax: bounds.priceMax,
    adults: 0,
    children: 0,
    infants: 0,
    sort: "date_asc",
    currency,
    newLinersOnly: false,
  };
}

export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
  cruises: CruiseRecord[]
): CruiseSearchFilters {
  const defaults = createDefaultFilters(cruises);
  const regions = parseList(params.where).filter((item) => item !== "Будь-який");
  const yearRaw = Array.isArray(params.year) ? params.year[0] : params.year;
  const year =
    yearRaw && yearRaw !== "Будь-коли" ? yearRaw : defaults.year;
  const months = sanitizeSelectedMonths(
    parseList(params.months).filter((item) =>
      MONTH_LABELS.includes(item as (typeof MONTH_LABELS)[number])
    ),
    year
  );
  const durationRaw = Array.isArray(params.duration)
    ? params.duration[0]
    : params.duration;
  const duration = HERO_DURATION_OPTIONS.includes(
    durationRaw as (typeof HERO_DURATION_OPTIONS)[number]
  )
    ? durationRaw!
    : defaults.duration;
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const currencyRaw = Array.isArray(params.currency)
    ? params.currency[0]
    : params.currency;
  const currency = parseCurrencyCode(currencyRaw);
  const bounds = getSearchBounds(cruises, currency);
  const newLinersRaw = Array.isArray(params.newLiners)
    ? params.newLiners[0]
    : params.newLiners;

  const priceMin = parseNumber(params.priceMin, bounds.priceMin);
  const priceMax = parseNumber(params.priceMax, bounds.priceMax);

  return {
    ...defaults,
    regions,
    company: Array.isArray(params.company)
      ? params.company[0] ?? ""
      : params.company ?? "",
    liner: Array.isArray(params.liner)
      ? params.liner[0] ?? ""
      : params.liner ?? "",
    year,
    months,
    duration,
    dateFrom: Array.isArray(params.dateFrom)
      ? params.dateFrom[0] ?? ""
      : params.dateFrom ?? "",
    dateTo: Array.isArray(params.dateTo)
      ? params.dateTo[0] ?? ""
      : params.dateTo ?? "",
    adults: parseNumber(params.adults, 0),
    children: parseNumber(params.children, 0),
    infants: parseNumber(params.infants, 0),
    durMin: bounds.durMin,
    durMax: bounds.durMax,
    priceMin: Math.min(Math.max(priceMin, bounds.priceMin), bounds.priceMax),
    priceMax: Math.max(Math.min(priceMax, bounds.priceMax), bounds.priceMin),
    sort: (sortRaw as CruiseSort) || defaults.sort,
    currency,
    newLinersOnly: newLinersRaw === "1",
  };
}

export function buildSearchParams(filters: Partial<CruiseSearchFilters>) {
  const params = new URLSearchParams();

  if (filters.regions?.length) {
    params.set("where", filters.regions.join(","));
  }

  if (filters.year && filters.year !== "Будь-коли") {
    params.set("year", filters.year);
  }

  if (filters.months?.length) {
    params.set("months", filters.months.join(","));
  }

  if (filters.duration && filters.duration !== "Будь-яка") {
    params.set("duration", filters.duration);
  }

  if (filters.company) params.set("company", filters.company);
  if (filters.liner) params.set("liner", filters.liner);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.adults) params.set("adults", String(filters.adults));
  if (filters.children) params.set("children", String(filters.children));
  if (filters.infants) params.set("infants", String(filters.infants));
  if (
    typeof filters.priceMin === "number" &&
    Number.isFinite(filters.priceMin)
  ) {
    params.set("priceMin", String(Math.round(filters.priceMin)));
  }
  if (
    typeof filters.priceMax === "number" &&
    Number.isFinite(filters.priceMax)
  ) {
    params.set("priceMax", String(Math.round(filters.priceMax)));
  }
  if (filters.sort && filters.sort !== "date_asc") {
    params.set("sort", filters.sort);
  }
  if (filters.currency && filters.currency !== DEFAULT_CURRENCY) {
    params.set("currency", filters.currency);
  }
  if (filters.newLinersOnly) {
    params.set("newLiners", "1");
  }

  return params.toString();
}
