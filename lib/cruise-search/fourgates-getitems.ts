import { loadFourgatesFilterMeta } from "./fourgates-filter-meta";
import type { CruiseSearchFilters, CruiseSort } from "./types";

const BASE = "https://4gates.cruises";
const AJAX = `${BASE}/search/ajax.php`;

/** 4gates often returns `{ items: null }` for NAT on wide date ranges; EUR is stable and rows still include ₴/$/€ in HTML. */
const GETITEMS_CURRENCY = "EUR" as const;
const FOURGATES_MAX_PRICE = 999_999;
const FOURGATES_MAX_NIGHTS = 999_999;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; VcruiseBot/1.0; +https://vcruise.com.ua)",
  Accept: "*/*",
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${BASE}/ua/search/?`,
};

export type GetitemsResponse = {
  total: number;
  items: Record<string, unknown>[];
  pageSize: number;
  pageCount: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatFourgatesDate(date: Date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function isoToFourgates(iso: string) {
  const [y, mo, d] = iso.split("-");
  if (!y || !mo || !d) return "";
  return `${d}.${mo}.${y}`;
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function fallbackDateRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 14);
  const end = new Date(today);
  end.setMonth(end.getMonth() + 36);
  return `${formatFourgatesDate(start)}-${formatFourgatesDate(end)}`;
}

export async function buildGetitemsDateRange(filters: CruiseSearchFilters) {
  if (filters.dateFrom && filters.dateTo) {
    return `${isoToFourgates(filters.dateFrom)}-${isoToFourgates(filters.dateTo)}`;
  }
  if (filters.dateFrom) {
    return `${isoToFourgates(filters.dateFrom)}-${isoToFourgates(addDaysIso(filters.dateFrom, 540))}`;
  }
  if (filters.dateTo) {
    return `${isoToFourgates(addDaysIso(filters.dateTo, -540))}-${isoToFourgates(filters.dateTo)}`;
  }
  if (filters.year && filters.year !== "Будь-коли") {
    return `01.01.${filters.year}-31.12.${filters.year}`;
  }

  try {
    const meta = await loadFourgatesFilterMeta();
    if (meta.dateMin && meta.dateMax) {
      return `${meta.dateMin}-${meta.dateMax}`;
    }
  } catch {
    // Fall through to local window.
  }
  return fallbackDateRange();
}

function mapSortToFourgates(sort: CruiseSort) {
  switch (sort) {
    case "date_desc":
      return "date_start desc,duration";
    case "price_asc":
      return "price,date_start";
    case "price_desc":
      return "price desc,date_start";
    case "duration_asc":
      return "duration,date_start";
    case "duration_desc":
      return "duration desc,date_start";
    default:
      return "date_start,duration";
  }
}

export type GetitemsFetchOptions = {
  cruiseId?: string;
  /** Comma-joined numeric region ids from 4gates getfilter. */
  regionIds?: string;
  /** 4gates ship_id (e.g. MA_MSC). liner_slug is ignored by getitems. */
  shipId?: string;
};

export async function buildGetitemsParams(
  filters: CruiseSearchFilters,
  page: number,
  options?: GetitemsFetchOptions,
) {
  const params = new URLSearchParams({
    act: "getitems",
    pg_num: String(page),
    dates: await buildGetitemsDateRange(filters),
    pr_min: "1",
    pr_max: String(FOURGATES_MAX_PRICE),
    // p_min/p_max are not night counts. Catalog durMax (e.g. 244) zeroes real sailings.
    p_min: "1",
    p_max: String(FOURGATES_MAX_NIGHTS),
    sort: mapSortToFourgates(filters.sort),
    curs: GETITEMS_CURRENCY,
    locale: "ua",
  });

  const cruiseId = options?.cruiseId?.trim();
  if (cruiseId) {
    params.set("cruise_id", cruiseId);
  }

  const regionIds = options?.regionIds?.trim();
  if (regionIds) {
    params.set("region_id", regionIds);
  }

  const shipId = options?.shipId?.trim();
  if (shipId) {
    params.set("ship_id", shipId);
  }

  return params;
}

function parseGetitemsJson(raw: string): {
  total: number;
  items: Record<string, unknown>[];
} {
  let data: { total?: number | string; items?: unknown };
  try {
    data = JSON.parse(raw) as { total?: number | string; items?: unknown };
  } catch {
    throw new Error("4gates getitems: не JSON");
  }

  const items = Array.isArray(data.items)
    ? data.items
    : data.items == null
      ? []
      : null;

  if (items === null) {
    throw new Error("4gates getitems: некоректна відповідь");
  }

  const total = Number.parseInt(String(data.total ?? items.length), 10);
  return {
    total: Number.isFinite(total) ? total : items.length,
    items,
  };
}

async function fetchGetitemsPageOnce(
  filters: CruiseSearchFilters,
  page: number,
  options?: GetitemsFetchOptions,
) {
  const params = await buildGetitemsParams(filters, page, options);
  const response = await fetch(`${AJAX}?${params}`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`4gates getitems HTTP ${response.status}`);
  }
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error("4gates getitems: порожня відповідь");
  }
  return parseGetitemsJson(raw);
}

export async function fetchGetitemsPage(
  filters: CruiseSearchFilters,
  page: number,
  options?: GetitemsFetchOptions,
): Promise<GetitemsResponse> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed = await fetchGetitemsPageOnce(filters, page, options);
      const items = parsed.items;
      const total = parsed.total;
      const pageSize = items.length || 10;
      const pageCount =
        pageSize > 0
          ? Math.ceil(Math.max(total, items.length) / pageSize)
          : 0;

      return {
        total,
        items,
        pageSize,
        pageCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error("4gates getitems: помилка запиту");
}

export async function fetchGetitemsCatalog(
  filters: CruiseSearchFilters,
  options?: {
    maxPages?: number;
    maxItems?: number;
    cruiseId?: string;
    regionIds?: string;
  },
) {
  const maxPages = Math.min(Math.max(options?.maxPages ?? 12, 1), 60);
  const maxItems = Math.min(Math.max(options?.maxItems ?? 240, 24), 1200);
  const fetchOptions: GetitemsFetchOptions = {
    cruiseId: options?.cruiseId,
    regionIds: options?.regionIds,
  };

  const first = await fetchGetitemsPage(filters, 0, fetchOptions);
  const collected = [...first.items];
  const pagesToFetch = Math.min(
    maxPages - 1,
    Math.max(first.pageCount - 1, 0),
  );

  for (let batchStart = 1; batchStart <= pagesToFetch; batchStart += 8) {
    const batch = [];
    for (let page = batchStart; page < batchStart + 8 && page <= pagesToFetch; page += 1) {
      batch.push(fetchGetitemsPage(filters, page, fetchOptions));
    }
    const pages = await Promise.all(batch);
    for (const page of pages) {
      collected.push(...page.items);
      if (collected.length >= maxItems) break;
    }
    if (collected.length >= maxItems) break;
  }

  return {
    items: collected.slice(0, maxItems),
    total: first.total,
    pageCount: first.pageCount,
  };
}
