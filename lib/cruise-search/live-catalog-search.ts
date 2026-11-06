import { filterCruises } from "./filter";
import {
  applyClientOnlyFilters,
  resolveFourgatesCruiseId,
} from "./fourgates-search-filters";
import { resolveFourgatesRegionIds } from "./fourgates-ids";
import { fetchGetitemsPage } from "./fourgates-getitems";
import { resolveFourgatesShipId } from "./fourgates-ships";
import { loadClientCruises } from "./load-cruises";
import { buildSearchParams } from "./params";
import { serializeCruisesForClient } from "./serialize-cruises";
import { structureGetitemsRows } from "./structure-getitems";
import type { CruiseRecord, CruiseSearchFilters } from "./types";

const CACHE_TTL_MS = 12 * 60 * 1000;
const PAGE_BATCH = 8;
const PAGE_OVERSHOOT = 6;
const DEFAULT_PAGE_SIZE = 12;

const sessions = new Map<string, ProgressiveSession>();
const fullCache = new Map<string, LiveCatalogResult>();
const fullInflight = new Map<string, Promise<LiveCatalogResult>>();

export type LiveCatalogResult = {
  cruises: CruiseRecord[];
  source: "live" | "disk";
  stale?: boolean;
  fetchedAt: number;
  total?: number;
  complete?: boolean;
  loaded?: number;
  nextOffset?: number | null;
};

type ProgressiveSession = {
  key: string;
  filters: CruiseSearchFilters;
  cruiseId: string;
  regionIds: string;
  shipId: string;
  claimedTotal: number;
  rawItems: Record<string, unknown>[];
  nextPage: number;
  pageLimit: number;
  maxItems: number;
  cruises: CruiseRecord[];
  complete: boolean;
  fetchedAt: number;
  pump: Promise<void> | null;
  regionAppliedOnServer: boolean;
  shipAppliedOnServer: boolean;
};

function cacheKey(filters: CruiseSearchFilters) {
  return `v14:${buildSearchParams(filters)}`;
}

function countUniqueKeys(items: Record<string, unknown>[]) {
  const seen = new Set<number>();
  for (const item of items) {
    const key = Number(item.key);
    if (Number.isFinite(key) && key > 0) seen.add(key);
  }
  return seen.size;
}

function clientFiltersMayReduce(
  filters: CruiseSearchFilters,
  shipAppliedOnServer = false,
) {
  return Boolean(
    (filters.liner && !shipAppliedOnServer) ||
      filters.newLinersOnly ||
      (filters.duration && filters.duration !== "Будь-яка") ||
      filters.months?.length,
  );
}

function rebuildSessionCruises(session: ProgressiveSession) {
  const structured = structureGetitemsRows(session.rawItems);
  const filtered = applyClientOnlyFilters(structured, session.filters, {
    regionAppliedOnServer: session.regionAppliedOnServer,
    shipAppliedOnServer: session.shipAppliedOnServer,
  });
  session.cruises = serializeCruisesForClient(filtered, undefined, {
    includeOffers: false,
  });
}

function diskFallback(filters: CruiseSearchFilters): LiveCatalogResult {
  const disk = loadClientCruises({ includeOffers: false });
  const filtered = filterCruises(disk, filters);
  const cruises = serializeCruisesForClient(filtered, undefined, {
    includeOffers: false,
  });
  return {
    cruises,
    source: "disk",
    stale: true,
    fetchedAt: Date.now(),
    total: cruises.length,
    complete: true,
    loaded: cruises.length,
    nextOffset: null,
  };
}

async function createSession(
  filters: CruiseSearchFilters,
  options?: { maxPages?: number; maxItems?: number },
): Promise<ProgressiveSession> {
  const cruiseId = resolveFourgatesCruiseId(filters.company);
  const regionIds = resolveFourgatesRegionIds(filters.regions);
  const shipId = filters.liner
    ? await resolveFourgatesShipId(filters.liner, filters.company)
    : "";
  const narrowed = Boolean(cruiseId || shipId || filters.liner || regionIds);
  const fetchOptions = { cruiseId, regionIds, shipId };
  const first = await fetchGetitemsPage(filters, 0, fetchOptions);
  const pageSize = first.items.length || 10;
  const claimedTotal = first.total;
  const estimatedPages =
    pageSize > 0
      ? Math.ceil(Math.max(claimedTotal, first.items.length) / pageSize)
      : 1;
  // Never truncate below 4gates `total` — otherwise subsets drift from the widget.
  const maxItems = Math.min(
    Math.max(
      options?.maxItems ?? (narrowed ? 1200 : 600),
      claimedTotal + 50,
      50,
    ),
    20_000,
  );
  const maxPages = Math.min(
    Math.max(
      options?.maxPages ?? (narrowed ? 80 : 40),
      estimatedPages + PAGE_OVERSHOOT,
      1,
    ),
    2_200,
  );

  const session: ProgressiveSession = {
    key: cacheKey(filters),
    filters,
    cruiseId,
    regionIds,
    shipId,
    claimedTotal,
    rawItems: [...first.items],
    nextPage: 1,
    pageLimit: Math.min(maxPages, estimatedPages + PAGE_OVERSHOOT),
    maxItems,
    cruises: [],
    complete: false,
    fetchedAt: Date.now(),
    pump: null,
    regionAppliedOnServer: Boolean(regionIds),
    shipAppliedOnServer: Boolean(shipId),
  };
  rebuildSessionCruises(session);

  if (
    !first.items.length ||
    countUniqueKeys(session.rawItems) >= claimedTotal ||
    session.nextPage >= session.pageLimit
  ) {
    session.complete = true;
  }

  return session;
}

async function pumpSession(session: ProgressiveSession, needCount: number) {
  if (session.complete) {
    rebuildSessionCruises(session);
    return;
  }

  const fetchOptions = {
    cruiseId: session.cruiseId,
    regionIds: session.regionIds,
    shipId: session.shipId,
  };
  let emptyStreak = 0;

  while (
    !session.complete &&
    session.cruises.length < needCount &&
    session.nextPage < session.pageLimit &&
    session.rawItems.length < session.maxItems
  ) {
    // Small batches until the visible page is ready; larger while prefetching.
    const deficit = needCount - session.cruises.length;
    const batchSize =
      deficit <= DEFAULT_PAGE_SIZE ? Math.min(2, PAGE_BATCH) : PAGE_BATCH;
    const batch = [];
    for (
      let page = session.nextPage;
      page < session.nextPage + batchSize && page < session.pageLimit;
      page += 1
    ) {
      batch.push(fetchGetitemsPage(session.filters, page, fetchOptions));
    }
    if (!batch.length) {
      session.complete = true;
      break;
    }

    const pages = await Promise.all(batch);
    session.nextPage += batch.length;
    let added = 0;
    for (const page of pages) {
      if (!page.items.length) {
        emptyStreak += 1;
        continue;
      }
      emptyStreak = 0;
      session.rawItems.push(...page.items);
      added += page.items.length;
    }

    rebuildSessionCruises(session);

    if (
      !added ||
      emptyStreak >= 2 ||
      countUniqueKeys(session.rawItems) >= session.claimedTotal
    ) {
      session.complete = true;
      break;
    }
  }

  if (session.nextPage >= session.pageLimit) {
    session.complete = true;
  }
  session.fetchedAt = Date.now();
}

function enqueuePump(session: ProgressiveSession, needCount: number) {
  const run = async () => {
    await pumpSession(session, needCount);
  };
  session.pump = (session.pump ?? Promise.resolve())
    .then(run, run)
    .finally(() => {
      if (session.pump && !session.complete) {
        // keep reference only while useful; cleared when idle after complete
      }
    });
  return session.pump;
}

function resolveTotal(session: ProgressiveSession) {
  if (session.complete) return session.cruises.length;
  // Region/company already applied on 4gates: claimed total is exact.
  return session.claimedTotal;
}

function pageFromSession(
  session: ProgressiveSession,
  offset: number,
  limit: number,
): LiveCatalogResult {
  const cruises = session.cruises.slice(offset, offset + limit);
  const total = resolveTotal(session);
  const loaded = session.cruises.length;
  const consumed = offset + cruises.length;
  const hasMore =
    consumed < loaded || (!session.complete && consumed < total);

  return {
    cruises,
    source: "live",
    fetchedAt: session.fetchedAt,
    total,
    complete: session.complete,
    loaded,
    nextOffset: hasMore ? consumed : null,
  };
}

function getSession(filters: CruiseSearchFilters) {
  const key = cacheKey(filters);
  const existing = sessions.get(key);
  if (existing && Date.now() - existing.fetchedAt < CACHE_TTL_MS) {
    return existing;
  }
  sessions.delete(key);
  return null;
}

/** Progressive page: exact total ASAP, cruise details loaded on demand. */
export async function searchLiveCatalogPage(
  filters: CruiseSearchFilters,
  options?: {
    offset?: number;
    limit?: number;
    maxPages?: number;
    maxItems?: number;
  },
): Promise<LiveCatalogResult> {
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_PAGE_SIZE, 1), 60);
  const needCount = offset + limit;

  try {
    let session = getSession(filters);
    if (!session) {
      session = await createSession(filters, options);
      sessions.set(session.key, session);
    }

    // Client-only filters change the real total — finish the scan before answering.
    if (clientFiltersMayReduce(filters, session.shipAppliedOnServer)) {
      await enqueuePump(session, session.claimedTotal || session.maxItems);
    } else if (
      offset === 0 &&
      limit <= DEFAULT_PAGE_SIZE &&
      session.cruises.length > 0 &&
      session.cruises.length < needCount &&
      !session.complete
    ) {
      // First paint only for the UI page size — larger limits wait for a full slice.
      void enqueuePump(session, needCount + limit);
    } else {
      await enqueuePump(session, needCount);
      if (!session.complete) {
        void enqueuePump(session, needCount + limit);
      }
    }

    let page = pageFromSession(session, offset, limit);

    // If this offset is past what we have and scan is still running, wait more.
    if (
      page.cruises.length === 0 &&
      offset > 0 &&
      !session.complete &&
      session.cruises.length < needCount
    ) {
      await enqueuePump(session, needCount);
      page = pageFromSession(session, offset, limit);
    }

    return page;
  } catch {
    return diskFallback(filters);
  }
}

/** Full catalog (detail page / callers that need every row). */
export async function searchLiveCatalog(
  filters: CruiseSearchFilters,
  options?: {
    maxPages?: number;
    maxItems?: number;
  },
): Promise<LiveCatalogResult> {
  const key = cacheKey(filters);
  const cached = fullCache.get(key);
  if (cached?.complete && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const pending = fullInflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const page = await searchLiveCatalogPage(filters, {
      ...options,
      offset: 0,
      limit: options?.maxItems ?? 1200,
    });
    const session = getSession(filters);
    if (session && !session.complete) {
      await enqueuePump(session, session.claimedTotal || session.maxItems);
    }
    const fresh = getSession(filters);
    const result: LiveCatalogResult = fresh
      ? {
          cruises: fresh.cruises,
          source: "live",
          fetchedAt: fresh.fetchedAt,
          total: fresh.cruises.length,
          complete: fresh.complete,
          loaded: fresh.cruises.length,
          nextOffset: null,
        }
      : { ...page, complete: true, nextOffset: null };
    fullCache.set(key, result);
    return result;
  })().finally(() => {
    fullInflight.delete(key);
  });

  fullInflight.set(key, promise);
  return promise;
}

export function invalidateLiveCatalogCache() {
  sessions.clear();
  fullCache.clear();
}
