import { fetchFourgatesFullRoute } from "./fourgates-itinerary";
import { findSimilarCruises } from "./similar-cruises";
import { searchLiveCatalog } from "./live-catalog-search";
import { loadCruisePage, loadCruises } from "./load-cruises";
import { parseSearchParams } from "./params";
import { serializeCruisesForClient } from "./serialize-cruises";
import { ownCruiseBookingUrl } from "./utils";
import type { CruiseRecord } from "./types";

async function withFullItinerary(cruise: CruiseRecord): Promise<CruiseRecord> {
  const bookingUrl = ownCruiseBookingUrl(cruise);
  if (!bookingUrl) return cruise;

  const fullRoute = await fetchFourgatesFullRoute(bookingUrl);
  if (!fullRoute?.length) return cruise;
  if (fullRoute.length <= (cruise.route?.length ?? 0)) {
    // Prefer normalized stops even when length matches (strip "… Port").
    const hasEllipsis = (cruise.route ?? []).some((stop) =>
      /^[.…]/u.test(stop.trim()),
    );
    if (!hasEllipsis) return cruise;
  }

  return { ...cruise, route: fullRoute };
}

export type DetailCruiseIdentity = {
  ship: string;
  sailing: string;
  nights: number;
  listQuery: string;
};

export type DetailCruisePage = {
  cruise: CruiseRecord;
  similar: CruiseRecord[];
};

function pickParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function readDetailIdentity(
  query: Record<string, string | string[] | undefined>,
): DetailCruiseIdentity {
  const nights = Number.parseInt(pickParam(query.nights), 10);
  return {
    ship: pickParam(query.ship).trim().toLowerCase(),
    sailing: pickParam(query.sailing).trim(),
    nights: Number.isFinite(nights) && nights > 0 ? nights : 0,
    listQuery: pickParam(query.from),
  };
}

function hasIdentity(identity: DetailCruiseIdentity) {
  return Boolean(identity.ship || identity.sailing || identity.nights);
}

/** Live getitems `key` is not the disk catalog key. Match the sailing itself. */
export function cruiseMatchesIdentity(
  cruise: CruiseRecord,
  identity: DetailCruiseIdentity,
) {
  if (!hasIdentity(identity)) return true;
  if (identity.ship && cruise.liner_slug?.toLowerCase() !== identity.ship) {
    return false;
  }
  if (identity.sailing && cruise.base_date_start !== identity.sailing) {
    return false;
  }
  if (identity.nights && cruise.nights !== identity.nights) return false;
  return true;
}

async function pageFromDisk(cruise: CruiseRecord): Promise<DetailCruisePage> {
  const loaded = loadCruisePage(cruise.key);
  if (
    loaded &&
    cruiseMatchesIdentity(loaded.cruise, {
      ship: cruise.liner_slug?.toLowerCase() ?? "",
      sailing: cruise.base_date_start ?? "",
      nights: cruise.nights ?? 0,
      listQuery: "",
    })
  ) {
    return {
      cruise: await withFullItinerary(loaded.cruise),
      similar: loaded.similar,
    };
  }

  const all = loadCruises();
  const enriched = await withFullItinerary(cruise);
  const [serialized] = serializeCruisesForClient([enriched], undefined, {
    includeOffers: false,
  });
  const similar = serializeCruisesForClient(
    findSimilarCruises(enriched, all, 3),
    undefined,
    { includeOffers: false },
  );
  return { cruise: serialized, similar };
}

function findDiskMatch(identity: DetailCruiseIdentity) {
  if (!identity.ship || !identity.sailing) return null;
  const matches = loadCruises().filter((cruise) =>
    cruiseMatchesIdentity(cruise, identity),
  );
  return matches[0] ?? null;
}

function listQueryRecord(listQuery: string) {
  const params = new URLSearchParams(listQuery);
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

async function findLiveMatch(key: number, identity: DetailCruiseIdentity) {
  const catalog = loadCruises();
  const filters = parseSearchParams(listQueryRecord(identity.listQuery), catalog);
  if (identity.sailing) {
    filters.dateFrom = identity.sailing;
    filters.dateTo = identity.sailing;
    filters.year = "Будь-коли";
    filters.months = [];
  }
  // The card's ship is the sailing, not the catalog liner dropdown.
  if (identity.ship) filters.liner = [];

  const result = await searchLiveCatalog(filters, {
    maxPages: 30,
    maxItems: 500,
  });
  const byKey = result.cruises.find(
    (cruise) => cruise.key === key && cruiseMatchesIdentity(cruise, identity),
  );
  if (byKey) return byKey;
  if (!identity.ship || !identity.sailing) return null;
  return (
    result.cruises.find((cruise) => cruiseMatchesIdentity(cruise, identity)) ??
    null
  );
}

export async function resolveDetailCruise(
  key: number,
  query: Record<string, string | string[] | undefined>,
): Promise<DetailCruisePage | null> {
  const identity = readDetailIdentity(query);
  const hinted = loadCruisePage(key);

  if (hinted && cruiseMatchesIdentity(hinted.cruise, identity)) {
    return {
      cruise: await withFullItinerary(hinted.cruise),
      similar: hinted.similar,
    };
  }

  const diskMatch = findDiskMatch(identity);
  if (diskMatch) return pageFromDisk(diskMatch);

  if (!hasIdentity(identity)) {
    if (!hinted) return null;
    return {
      cruise: await withFullItinerary(hinted.cruise),
      similar: hinted.similar,
    };
  }

  const live = await findLiveMatch(key, identity);
  if (!live) return null;

  const enriched = await withFullItinerary(live);
  const all = loadCruises();
  const similar = serializeCruisesForClient(
    findSimilarCruises(enriched, all, 3),
    undefined,
    { includeOffers: false },
  );
  return { cruise: enriched, similar };
}
