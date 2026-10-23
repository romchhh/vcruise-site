import {
  MONTH_INDEX,
  NEW_LINER_MIN_BUILT_YEAR,
} from "./constants";
import { sanitizeSelectedMonths } from "./month-helpers";
import { matchesCruiseRegions } from "./region-match";
import {
  cheapestPrice,
  getDurationBounds,
  hasBookableDates,
  sailingDateInFilter,
  todayIso,
} from "./utils";
import type { CruiseRecord, CruiseSearchFilters, CruiseSort } from "./types";

function matchesHeroDuration(cruise: CruiseRecord, duration: string) {
  const bounds = getDurationBounds(duration);
  if (!bounds) return true;
  return cruise.nights >= bounds.min && cruise.nights <= bounds.max;
}

function matchesYearAndMonths(
  cruise: CruiseRecord,
  year: string,
  months: string[]
) {
  if (year === "Будь-коли" && months.length === 0) return true;

  const today = todayIso();
  const dates = (cruise.available_dates ?? [])
    .map((item) => item.date)
    .filter((date): date is string => Boolean(date && date >= today));

  const pool =
    dates.length > 0
      ? dates
      : cruise.base_date_start && cruise.base_date_start >= today
        ? [cruise.base_date_start]
        : [];

  if (!pool.length) return year === "Будь-коли" && months.length === 0;

  const activeMonths = sanitizeSelectedMonths(months, year);

  return pool.some((iso) => {
    const [dateYear, dateMonth] = iso.split("-");
    if (year !== "Будь-коли" && dateYear !== year) return false;

    if (!activeMonths.length) return true;

    const monthIndex = Number(dateMonth) - 1;
    return activeMonths.some((label) => MONTH_INDEX[label] === monthIndex);
  });
}

function matchesDateRange(
  cruise: CruiseRecord,
  dateFrom: string,
  dateTo: string
) {
  if (!dateFrom && !dateTo) return true;

  const today = todayIso();
  const dates = (cruise.available_dates ?? [])
    .map((item) => item.date)
    .filter((date): date is string => Boolean(date && date >= today));

  if (!dates.length) return false;

  // Only «від» → exact sailing day (not «from this day onward»).
  if (dateFrom && !dateTo) {
    return dates.some((date) => date === dateFrom);
  }

  if (!dateFrom && dateTo) {
    return dates.some((date) => date <= dateTo);
  }

  return dates.some(
    (date) => date >= dateFrom && date <= dateTo,
  );
}

export function filterCruises(
  cruises: CruiseRecord[],
  filters: CruiseSearchFilters
) {
  return cruises.filter((cruise) => {
    if (!hasBookableDates(cruise)) return false;

    if (filters.company && cruise.cruise_title !== filters.company) {
      return false;
    }

    if (filters.liner && cruise.liner_slug !== filters.liner) {
      return false;
    }

    if (!matchesCruiseRegions(cruise, filters.regions)) return false;

    if (!matchesHeroDuration(cruise, filters.duration)) return false;

    if (
      !matchesYearAndMonths(cruise, filters.year, filters.months)
    ) {
      return false;
    }

    if (!matchesDateRange(cruise, filters.dateFrom, filters.dateTo)) {
      return false;
    }

    if (
      filters.newLinersOnly &&
      (cruise.ship_built_year ?? 0) < NEW_LINER_MIN_BUILT_YEAR
    ) {
      return false;
    }

    const price = cheapestPrice(cruise, filters.currency);
    if (price != null) {
      if (price < filters.priceMin || price > filters.priceMax) {
        return false;
      }
    }

    return true;
  });
}

export function sortCruises(
  cruises: CruiseRecord[],
  sort: CruiseSort,
  currency: CruiseSearchFilters["currency"] = "NAT",
  dateFrom = "",
  dateTo = "",
) {
  return [...cruises].sort((left, right) => {
    if (sort.startsWith("date")) {
      const leftDate =
        sailingDateInFilter(left, dateFrom, dateTo) ?? "";
      const rightDate =
        sailingDateInFilter(right, dateFrom, dateTo) ?? "";
      return sort === "date_asc"
        ? leftDate.localeCompare(rightDate)
        : rightDate.localeCompare(leftDate);
    }

    if (sort.startsWith("price")) {
      const leftPrice = cheapestPrice(left, currency) ?? Number.POSITIVE_INFINITY;
      const rightPrice =
        cheapestPrice(right, currency) ?? Number.POSITIVE_INFINITY;
      return sort === "price_asc"
        ? leftPrice - rightPrice
        : rightPrice - leftPrice;
    }

    if (sort.startsWith("duration")) {
      const leftNights = left.nights ?? 0;
      const rightNights = right.nights ?? 0;
      return sort === "duration_asc"
        ? leftNights - rightNights
        : rightNights - leftNights;
    }

    return 0;
  });
}
