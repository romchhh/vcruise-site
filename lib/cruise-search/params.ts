import {
  HERO_DURATION_OPTIONS,
  MONTH_LABELS,
} from "./constants";
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
  cruises: CruiseRecord[]
): CruiseSearchFilters {
  const bounds = getSearchBounds(cruises);

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
    currency: "NAT",
    newLinersOnly: true,
  };
}

export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
  cruises: CruiseRecord[]
): CruiseSearchFilters {
  const defaults = createDefaultFilters(cruises);
  const regions = parseList(params.where).filter((item) => item !== "Будь-який");
  const months = parseList(params.months).filter((item) =>
    MONTH_LABELS.includes(item as (typeof MONTH_LABELS)[number])
  );
  const durationRaw = Array.isArray(params.duration)
    ? params.duration[0]
    : params.duration;
  const duration = HERO_DURATION_OPTIONS.includes(
    durationRaw as (typeof HERO_DURATION_OPTIONS)[number]
  )
    ? durationRaw!
    : defaults.duration;
  const yearRaw = Array.isArray(params.year) ? params.year[0] : params.year;
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const currencyRaw = Array.isArray(params.currency)
    ? params.currency[0]
    : params.currency;
  const newLinersRaw = Array.isArray(params.newLiners)
    ? params.newLiners[0]
    : params.newLiners;

  return {
    ...defaults,
    regions,
    company: Array.isArray(params.company)
      ? params.company[0] ?? ""
      : params.company ?? "",
    liner: Array.isArray(params.liner)
      ? params.liner[0] ?? ""
      : params.liner ?? "",
    year: yearRaw && yearRaw !== "Будь-коли" ? yearRaw : defaults.year,
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
    sort: (sortRaw as CruiseSort) || defaults.sort,
    currency: (currencyRaw as CurrencyCode) || defaults.currency,
    newLinersOnly: newLinersRaw !== "0",
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
  if (filters.sort && filters.sort !== "date_asc") {
    params.set("sort", filters.sort);
  }
  if (filters.currency && filters.currency !== "NAT") {
    params.set("currency", filters.currency);
  }
  if (filters.newLinersOnly === false) {
    params.set("newLiners", "0");
  }

  return params.toString();
}
