import { SEARCH_RESULTS_PAGE_SIZE } from "./constants";
import {
  fetchJsonWithRetry,
  normalizeClientFetchError,
} from "./fetch-with-retry";
import type { CruiseRecord } from "./types";

export type CruiseSearchPayload = {
  cruises: CruiseRecord[];
  source: "live" | "disk";
  stale: boolean;
  fetchedAt: number;
  total?: number;
  loaded?: number;
  complete?: boolean;
  nextOffset?: number | null;
  catalogFileUpdatedAt?: string | null;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; payload: CruiseSearchPayload }>();
const inflight = new Map<string, Promise<CruiseSearchPayload>>();

function readCache(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.payload;
}

function pageCacheKey(listQuery: string, offset: number, limit: number) {
  return `${listQuery.trim()}|o=${offset}|l=${limit}`;
}

export async function fetchCruiseSearch(
  listQuery: string,
  options?: {
    forceRefresh?: boolean;
    offset?: number;
    limit?: number;
  },
): Promise<CruiseSearchPayload> {
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.max(1, options?.limit ?? SEARCH_RESULTS_PAGE_SIZE);
  const key = pageCacheKey(listQuery, offset, limit);

  if (!options?.forceRefresh) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const params = new URLSearchParams(listQuery.trim());
  params.set("offset", String(offset));
  params.set("limit", String(limit));
  const path = `/api/cruise-search?${params}`;

  const promise = fetchJsonWithRetry<CruiseSearchPayload>(path, {
    retries: 2,
    timeoutMs: 90_000,
    init: { cache: "no-store" },
  })
    .then((payload) => {
      const normalized: CruiseSearchPayload = {
        cruises: payload.cruises ?? [],
        source: payload.source === "disk" ? "disk" : "live",
        stale: Boolean(payload.stale),
        fetchedAt: payload.fetchedAt ?? Date.now(),
        total:
          typeof payload.total === "number"
            ? payload.total
            : Number(payload.total) || undefined,
        loaded:
          typeof payload.loaded === "number"
            ? payload.loaded
            : payload.cruises?.length,
        complete: payload.complete !== false,
        nextOffset:
          payload.nextOffset === undefined ? null : payload.nextOffset,
        catalogFileUpdatedAt: payload.catalogFileUpdatedAt,
      };
      if (normalized.source === "live" && normalized.cruises.length) {
        cache.set(key, { at: Date.now(), payload: normalized });
      }
      return normalized;
    })
    .catch((error) => {
      throw new Error(normalizeClientFetchError(error));
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function clearCruiseSearchClientCache() {
  cache.clear();
}
