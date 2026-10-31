import {
  MONTH_INDEX,
  NEW_LINER_MIN_BUILT_YEAR,
} from "./constants";
import { sanitizeSelectedMonths } from "./month-helpers";
import { matchesCruiseRegions } from "./region-match";
import {
  cheapestPriceOnDate,
  getDurationBounds,
  getUpcomingDates,
  hasBookableDates,
} from "./utils";
import type { CruiseRecord, CruiseSearchFilters, CruiseSort } from "./types";

function matchesHeroDuration(cruise: CruiseRecord, duration: string) {
  const bounds = getDurationBounds(duration);
  if (!bounds) return true;
  return cruise.nights >= bounds.min && cruise.nights <= bounds.max;
}

export type SailingWindow = {
  dateFrom?: string;
  dateTo?: string;
  year?: string;
  months?: string[];
};

export function hasSailingWindow(window: SailingWindow) {
  return Boolean(
    window.dateFrom ||
      window.dateTo ||
      (window.year && window.year !== "Будь-коли") ||
      window.months?.length,
  );
}

function isoInSailingWindow(iso: string, window: SailingWindow) {
  const dateFrom = window.dateFrom ?? "";
  const dateTo = window.dateTo ?? "";
  const year = window.year && window.year !== "Будь-коли" ? window.year : "";
  const months = window.months ?? [];

  if (dateFrom && dateTo) {
    if (iso < dateFrom || iso > dateTo) return false;
  } else if (dateFrom) {
    if (iso !== dateFrom) return false;
  } else if (dateTo) {
    if (iso > dateTo) return false;
  }

  if (year && iso.slice(0, 4) !== year) return false;

  if (months.length) {
    const monthIndex = Number(iso.slice(5, 7)) - 1;
    const monthYear = year || iso.slice(0, 4);
    const activeMonths = sanitizeSelectedMonths(months, monthYear);
    if (!activeMonths.some((label) => MONTH_INDEX[label] === monthIndex)) {
      return false;
    }
  }

  return true;
}

/** The cruise's own departure, when it satisfies date range, year and months. */
export function matchingSailingDates(
  cruise: CruiseRecord,
  window: SailingWindow = {},
) {
  const date = getUpcomingDates(cruise)[0]?.date;
  if (!date) return [];
  if (hasSailingWindow(window) && !isoInSailingWindow(date, window)) return [];
  return [date];
}

function bookingUrlMatchesLiner(
  cruise: CruiseRecord,
  iso: string,
  linerSlug: string,
) {
  const entry = (cruise.available_dates ?? []).find((item) => item.date === iso);
  const url = entry?.booking_url?.toLowerCase() ?? "";
  if (!url) return true;
  return url.includes(linerSlug.toLowerCase());
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

    const sailings = matchingSailingDates(cruise, filters).filter((iso) =>
      filters.liner
        ? bookingUrlMatchesLiner(cruise, iso, filters.liner)
        : true,
    );

    if (filters.liner && sailings.length === 0) return false;
    if (hasSailingWindow(filters) && sailings.length === 0) return false;

    if (!matchesCruiseRegions(cruise, filters.regions)) return false;

    if (!matchesHeroDuration(cruise, filters.duration)) return false;

    if (
      filters.newLinersOnly &&
      (cruise.ship_built_year ?? 0) < NEW_LINER_MIN_BUILT_YEAR
    ) {
      return false;
    }

    const price = cheapestPriceOnDate(
      cruise,
      sailings[0],
      filters.currency,
    );
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
  currency: CruiseSearchFilters["currency"] = "EUR",
  window: SailingWindow = {},
) {
  const sailingOf = (cruise: CruiseRecord) =>
    matchingSailingDates(cruise, window)[0] ?? "";

  return [...cruises].sort((left, right) => {
    if (sort.startsWith("date")) {
      const leftDate = sailingOf(left);
      const rightDate = sailingOf(right);
      return sort === "date_asc"
        ? leftDate.localeCompare(rightDate)
        : rightDate.localeCompare(leftDate);
    }

    if (sort.startsWith("price")) {
      const leftPrice =
        cheapestPriceOnDate(left, sailingOf(left), currency) ??
        Number.POSITIVE_INFINITY;
      const rightPrice =
        cheapestPriceOnDate(right, sailingOf(right), currency) ??
        Number.POSITIVE_INFINITY;
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
