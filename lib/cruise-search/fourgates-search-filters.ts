import { NEW_LINER_MIN_BUILT_YEAR } from "./constants";
import {
  hasSailingWindow,
  matchingSailingDates,
} from "./filter";
import { resolveFourgatesCruiseIdFromTitle } from "./fourgates-ids";
import { matchesCruiseRegions } from "./region-match";
import { cheapestPrice, getDurationBounds } from "./utils";
import type { CruiseRecord, CruiseSearchFilters } from "./types";

export type ClientFilterOptions = {
  /** Region already narrowed via getitems `region_id` — skip name rematch. */
  regionAppliedOnServer?: boolean;
  /** Liner already narrowed via getitems `ship_id`. */
  shipAppliedOnServer?: boolean;
};

/** Filters 4gates getitems does not receive reliably — apply on live rows only. */
export function applyClientOnlyFilters(
  cruises: CruiseRecord[],
  filters: CruiseSearchFilters,
  options?: ClientFilterOptions,
) {
  const window = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    year: filters.year,
    months: filters.months,
  };
  const applyRegion = !options?.regionAppliedOnServer;
  const applyLiner = !options?.shipAppliedOnServer;

  return cruises.filter((cruise) => {
    if (
      filters.newLinersOnly &&
      (cruise.ship_built_year ?? 0) < NEW_LINER_MIN_BUILT_YEAR
    ) {
      return false;
    }

    if (
      applyLiner &&
      filters.liner &&
      cruise.liner_slug !== filters.liner
    ) {
      return false;
    }

    if (filters.company && cruise.cruise_title !== filters.company) {
      return false;
    }

    const price = cheapestPrice(cruise, filters.currency);
    if (price != null) {
      if (price < filters.priceMin || price > filters.priceMax) {
        return false;
      }
    }

    const durationBounds = getDurationBounds(filters.duration);
    if (durationBounds) {
      const nights = cruise.nights ?? 0;
      if (nights < durationBounds.min || nights > durationBounds.max) {
        return false;
      }
    }

    if (applyRegion && !matchesCruiseRegions(cruise, filters.regions)) {
      return false;
    }

    if (hasSailingWindow(window)) {
      if (matchingSailingDates(cruise, window).length === 0) {
        return false;
      }
    }

    return true;
  });
}

export function resolveFourgatesCruiseId(
  company: string,
  catalog?: CruiseRecord[],
) {
  const fromMap = resolveFourgatesCruiseIdFromTitle(company);
  if (fromMap) return fromMap;
  if (!company || !catalog?.length) return "";
  const match = catalog.find((cruise) => cruise.cruise_title === company);
  return match?.cruise_id?.trim() ?? "";
}
