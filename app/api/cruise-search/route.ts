import { NextResponse } from "next/server";
import { SEARCH_RESULTS_PAGE_SIZE } from "@/lib/cruise-search/constants";
import { readCatalogFileUpdatedAt } from "@/lib/cruise-search/catalog-meta";
import { loadOffersCacheMeta } from "@/lib/cruise-search/load-offers-cache";
import { searchLiveCatalogPage } from "@/lib/cruise-search/live-catalog-search";
import {
  createDefaultFilters,
  parseSearchParams,
} from "@/lib/cruise-search/params";

export const runtime = "nodejs";

const LIVE_CACHE = "private, max-age=30, stale-while-revalidate=120";
const DISK_CACHE = "private, max-age=300, stale-while-revalidate=3600";

/** Wide live bounds — disk catalog is not loaded on this hot path. */
const LIVE_BOUNDS = {
  durMin: 1,
  durMax: 244,
  priceMin: 1,
  priceMax: 99_999_999,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const filters = parseSearchParams(params, []);
  Object.assign(filters, {
    durMin: LIVE_BOUNDS.durMin,
    durMax: LIVE_BOUNDS.durMax,
  });

  const priceMinRaw = searchParams.get("priceMin");
  const priceMaxRaw = searchParams.get("priceMax");
  if (priceMinRaw != null && Number.isFinite(Number(priceMinRaw))) {
    filters.priceMin = Number(priceMinRaw);
  } else {
    filters.priceMin = LIVE_BOUNDS.priceMin;
  }
  if (priceMaxRaw != null && Number.isFinite(Number(priceMaxRaw))) {
    filters.priceMax = Number(priceMaxRaw);
  } else {
    filters.priceMax = LIVE_BOUNDS.priceMax;
  }

  if (!filters.currency) {
    Object.assign(filters, createDefaultFilters([], filters.currency));
  }

  const offset = Math.max(
    0,
    Number.parseInt(searchParams.get("offset") || "0", 10) || 0,
  );
  const limitRaw = Number.parseInt(
    searchParams.get("limit") || String(SEARCH_RESULTS_PAGE_SIZE),
    10,
  );
  const limit = Number.isFinite(limitRaw)
    ? limitRaw
    : SEARCH_RESULTS_PAGE_SIZE;

  const narrowed = Boolean(
    filters.company || filters.liner || filters.regions.length,
  );

  try {
    const result = await searchLiveCatalogPage(filters, {
      offset,
      limit,
      maxPages: searchParams.get("full") === "1" || narrowed ? 80 : 40,
      maxItems: searchParams.get("full") === "1" || narrowed ? 1200 : 600,
    });

    const headers = {
      "Cache-Control": result.source === "live" ? LIVE_CACHE : DISK_CACHE,
    };

    return NextResponse.json(
      {
        cruises: result.cruises,
        source: result.source,
        stale: result.stale ?? false,
        total: result.total,
        loaded: result.loaded,
        complete: result.complete ?? true,
        nextOffset: result.nextOffset ?? null,
        offset,
        limit,
        fetchedAt: result.fetchedAt,
        catalogFileUpdatedAt: readCatalogFileUpdatedAt(),
        offersCache: loadOffersCacheMeta(),
      },
      { headers },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "4gates getitems failed";
    return NextResponse.json(
      { error: message, cruises: [], source: "live", stale: false },
      { status: 502 },
    );
  }
}
