import {
  FINDER_REGION_ALIASES,
  HERO_DESTINATION_REGION_IDS,
  MONTH_INDEX,
  NEW_LINER_MIN_BUILT_YEAR,
  REGION_TREE,
} from "./constants";
import { sanitizeSelectedMonths } from "./month-helpers";
import {
  cheapestPrice,
  getDurationBounds,
  hasBookableDates,
  nearestDate,
  todayIso,
} from "./utils";
import type { CruiseRecord, CruiseSearchFilters, CruiseSort } from "./types";

function matchesRegions(cruise: CruiseRecord, regions: string[]) {
  if (!regions.length) return true;

  return regions.some((region) => {
    if (cruise.region_name === region || cruise.region_id === region) {
      return true;
    }

    for (const group of REGION_TREE) {
      for (const [id, label] of group.items) {
        if (region === id || region === label) {
          if (cruise.region_id === id || cruise.region_name === label) {
            return true;
          }
        }
      }
    }

    const heroIds = HERO_DESTINATION_REGION_IDS[region];
    const finderIds = FINDER_REGION_ALIASES[region];
    const ids = heroIds ?? finderIds;

    if (!ids?.length) return false;

    return (
      ids.includes(cruise.region_id) ||
      ids.some((id) => cruise.region_name.includes(id))
    );
  });
}

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

  if (!dates.length) return !dateFrom && !dateTo;

  return dates.some(
    (date) =>
      (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)
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

    if (!matchesRegions(cruise, filters.regions)) return false;

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

    return true;
  });
}

export function sortCruises(
  cruises: CruiseRecord[],
  sort: CruiseSort,
  currency: CruiseSearchFilters["currency"] = "NAT"
) {
  return [...cruises].sort((left, right) => {
    if (sort.startsWith("date")) {
      const leftDate = nearestDate(left) ?? "";
      const rightDate = nearestDate(right) ?? "";
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
