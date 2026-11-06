"use client";

import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchCruiseSearch } from "@/lib/cruise-search/fetch-cruise-search-client";
import { buildCruiseDetailPath } from "@/lib/cruise-search/cruise-detail-url";
import {
  clearSearchListState,
  restoreSearchListState,
  saveSearchListState,
} from "@/lib/cruise-search/search-list-session";
import {
  DEFAULT_CURRENCY,
  SEARCH_RESULTS_PAGE_SIZE,
} from "@/lib/cruise-search/constants";

const CATALOG_FETCH_DEBOUNCE_MS = 320;
import { FEATURED_CRUISE_COMPANIES } from "@/lib/cruise-search/companies";
import {
  groupCruisesByItinerary,
  itineraryGroupKey,
  sortCruises,
} from "@/lib/cruise-search/filter";
import {
  alignCompanyLinerFilters,
  buildSearchParams,
  createDefaultFilters,
  parseSearchParams,
} from "@/lib/cruise-search/params";
import { effectiveMonthYear, sanitizeSelectedMonths } from "@/lib/cruise-search/month-helpers";
import { getSearchBounds, hasBookableDates } from "@/lib/cruise-search/utils";
import type {
  CruiseRecord,
  CruiseSearchFilters as CruiseSearchFiltersState,
} from "@/lib/cruise-search/types";
import CruiseCurrencyToggle from "./CruiseCurrencyToggle";
import CruiseInlineLoader from "./CruiseInlineLoader";
import CruiseSearchFilters from "./CruiseSearchFilters";
import CruiseSearchResultCard from "./CruiseSearchResultCard";
import CruiseSortControls from "./CruiseSortControls";

export default function CruiseSearchApp({
  cruises,
}: {
  cruises: CruiseRecord[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultsAnchorRef = useRef<HTMLDivElement>(null);
  const bookableBaseline = useMemo(
    () => cruises.filter((cruise) => hasBookableDates(cruise)),
    [cruises],
  );

  const appliedFilters = useMemo(() => {
    const params: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return parseSearchParams(params, bookableBaseline);
  }, [bookableBaseline, searchParams]);

  const [draftFilters, setDraftFilters] =
    useState<CruiseSearchFiltersState>(appliedFilters);

  const [liveCatalog, setLiveCatalog] = useState<CruiseRecord[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogSource, setCatalogSource] = useState<"live" | "disk" | null>(
    null,
  );
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);
  const [catalogNextOffset, setCatalogNextOffset] = useState<number | null>(
    null,
  );
  const catalogRequestRef = useRef(0);
  const restoreVisibleRef = useRef(0);

  const bookableCruises = bookableBaseline;

  const priceBounds = useMemo(
    () => getSearchBounds(bookableCruises, appliedFilters.currency),
    [bookableCruises, appliedFilters.currency],
  );

  const defaults = useMemo(
    () => createDefaultFilters(bookableCruises, appliedFilters.currency),
    [bookableCruises, appliedFilters.currency],
  );
  const pendingScrollRef = useRef<number | null>(null);
  const pendingScrollMinCountRef = useRef(0);
  const lastFilterQueryRef = useRef<string | null>(null);
  const listQuery = searchParams.toString();
  const filterQueryKey = useMemo(
    () => buildSearchParams(appliedFilters),
    [appliedFilters],
  );

  const deepLinkCruiseKey = searchParams.get("cruise");
  const deepLinkDate =
    searchParams.get("dateFrom") || searchParams.get("dateTo") || "";

  useEffect(() => {
    if (!deepLinkCruiseKey) return;
    const key = Number(deepLinkCruiseKey);
    if (!Number.isFinite(key)) return;
    if (!bookableCruises.some((cruise) => cruise.key === key)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("cruise");
    const nextListQuery = params.toString();

    const linked = bookableCruises.find((cruise) => cruise.key === key);
    router.replace(
      buildCruiseDetailPath(key, {
        listQuery: nextListQuery,
        sailing: linked?.base_date_start || deepLinkDate,
        ship: linked?.liner_slug,
        nights: linked?.nights,
        currency: appliedFilters.currency,
        adults: appliedFilters.adults > 0 ? appliedFilters.adults : 2,
        children: appliedFilters.children,
        infants: appliedFilters.infants,
      }),
    );
  }, [
    bookableCruises,
    deepLinkCruiseKey,
    deepLinkDate,
    appliedFilters.adults,
    appliedFilters.children,
    appliedFilters.currency,
    appliedFilters.infants,
    router,
    searchParams,
  ]);

  const companies = useMemo(() => {
    const available = new Set(
      bookableCruises.map((cruise) => cruise.cruise_title),
    );
    const list: string[] = FEATURED_CRUISE_COMPANIES.filter((company) =>
      available.has(company),
    );
    // Keep a company from deep-links even if it's outside the featured list.
    if (
      appliedFilters.company &&
      !list.includes(appliedFilters.company) &&
      available.has(appliedFilters.company)
    ) {
      list.push(appliedFilters.company);
    }
    return list.sort((a, b) => a.localeCompare(b, "uk"));
  }, [bookableCruises, appliedFilters.company]);

  const liners = useMemo(() => {
    const pool = draftFilters.company
      ? bookableCruises.filter(
          (cruise) => cruise.cruise_title === draftFilters.company
        )
      : bookableCruises;

    const map = new Map(
      pool
        .filter((cruise) => cruise.liner_slug && cruise.liner_name)
        .map((cruise) => [cruise.liner_slug, cruise.liner_name!]),
    );

    // Ensure the selected liner from URL is always visible in the dropdown.
    if (draftFilters.liner && !map.has(draftFilters.liner)) {
      const match = bookableCruises.find(
        (cruise) => cruise.liner_slug === draftFilters.liner,
      );
      if (match?.liner_name) {
        map.set(draftFilters.liner, match.liner_name);
      }
    }

    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "uk"));
  }, [bookableCruises, draftFilters.company, draftFilters.liner]);

  useEffect(() => {
    const previousKey = lastFilterQueryRef.current;
    if (previousKey === filterQueryKey) return;
    lastFilterQueryRef.current = filterQueryKey;

    if (previousKey === null) {
      const restored = restoreSearchListState(listQuery);
      if (restored) {
        restoreVisibleRef.current = Math.max(
          restored.visibleCount,
          SEARCH_RESULTS_PAGE_SIZE,
        );
        pendingScrollMinCountRef.current = restoreVisibleRef.current;
        pendingScrollRef.current = restored.scrollY;
        return;
      }
    }

    restoreVisibleRef.current = 0;
    pendingScrollRef.current = null;
    pendingScrollMinCountRef.current = 0;
  }, [filterQueryKey, listQuery]);

  useEffect(() => {
    const requestId = catalogRequestRef.current + 1;
    catalogRequestRef.current = requestId;
    setCatalogLoading(true);
    setCatalogLoadingMore(false);
    setCatalogError("");
    setLiveCatalog(null);
    setCatalogSource(null);
    setCatalogTotal(null);
    setCatalogNextOffset(null);

    const initialLimit = Math.max(
      SEARCH_RESULTS_PAGE_SIZE,
      restoreVisibleRef.current || SEARCH_RESULTS_PAGE_SIZE,
    );

    const debounceTimer = window.setTimeout(() => {
      void fetchCruiseSearch(listQuery, { offset: 0, limit: initialLimit })
        .then((payload) => {
          if (requestId !== catalogRequestRef.current) return;
          setCatalogLoading(false);
          setCatalogSource(payload.source);
          setCatalogTotal(payload.total ?? payload.cruises.length);
          setLiveCatalog(payload.cruises);
          setCatalogNextOffset(payload.nextOffset ?? null);
          restoreVisibleRef.current = 0;
          if (payload.source === "disk" && payload.stale) {
            setCatalogError(
              "Не вдалося оновити дані з 4gates. Показано резервну копію каталогу.",
            );
          }
        })
        .catch((error) => {
          if (requestId !== catalogRequestRef.current) return;
          setCatalogLoading(false);
          setLiveCatalog([]);
          setCatalogSource(null);
          setCatalogNextOffset(null);
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Не вдалося завантажити круїзи з 4gates.",
          );
        });
    }, CATALOG_FETCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [listQuery]);

  const showCatalogLoader = catalogLoading;

  const filteredCruises = useMemo(() => {
    if (showCatalogLoader) return [];
    if (liveCatalog) return liveCatalog;
    return [];
  }, [liveCatalog, showCatalogLoader]);

  const results = useMemo(() => {
    if (catalogSource === "live") {
      return filteredCruises.map((cruise) => [cruise]);
    }
    const sorted = sortCruises(
      filteredCruises,
      appliedFilters.sort,
      appliedFilters.currency,
      {
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        year: appliedFilters.year,
        months: appliedFilters.months,
      },
    );
    return groupCruisesByItinerary(sorted);
  }, [filteredCruises, appliedFilters, catalogSource]);

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  const visibleResults = results;

  useLayoutEffect(() => {
    if (pendingScrollRef.current == null) return;
    if (results.length < pendingScrollMinCountRef.current) return;

    const scrollY = pendingScrollRef.current;
    let cancelled = false;
    let attempts = 0;

    const finish = () => {
      if (cancelled) return;
      pendingScrollRef.current = null;
      pendingScrollMinCountRef.current = 0;
      clearSearchListState();
    };

    const tryScroll = () => {
      if (cancelled) return;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      if (maxScroll >= scrollY - 32 || attempts >= 60) {
        window.scrollTo({
          top: Math.min(scrollY, maxScroll),
          left: 0,
          behavior: "instant",
        });
        finish();
        return;
      }
      attempts += 1;
      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [results.length]);

  const hasMoreResults =
    catalogNextOffset != null &&
    (catalogTotal == null || results.length < catalogTotal);

  const loadMoreResults = () => {
    if (catalogNextOffset == null || catalogLoadingMore) return;
    const requestId = catalogRequestRef.current;
    const offset = catalogNextOffset;
    setCatalogLoadingMore(true);
    void fetchCruiseSearch(listQuery, {
      offset,
      limit: SEARCH_RESULTS_PAGE_SIZE,
    })
      .then((payload) => {
        if (requestId !== catalogRequestRef.current) return;
        setLiveCatalog((current) => {
          const seen = new Set((current ?? []).map((cruise) => cruise.key));
          const merged = [...(current ?? [])];
          for (const cruise of payload.cruises) {
            if (seen.has(cruise.key)) continue;
            seen.add(cruise.key);
            merged.push(cruise);
          }
          return merged;
        });
        setCatalogTotal(payload.total ?? catalogTotal);
        setCatalogNextOffset(payload.nextOffset ?? null);
        setCatalogSource(payload.source);
        setCatalogLoadingMore(false);
      })
      .catch((error) => {
        if (requestId !== catalogRequestRef.current) return;
        setCatalogLoadingMore(false);
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Не вдалося підвантажити наступні круїзи.",
        );
      });
  };

  const openCruise = (cruise: CruiseRecord, preferredDate?: string) => {
    saveSearchListState({
      listQuery,
      scrollY: window.scrollY,
      visibleCount: results.length,
    });

    router.push(
      buildCruiseDetailPath(cruise.key, {
        listQuery,
        sailing: preferredDate || cruise.base_date_start,
        ship: cruise.liner_slug,
        nights: cruise.nights,
        currency: appliedFilters.currency,
        adults: appliedFilters.adults > 0 ? appliedFilters.adults : 2,
        children: appliedFilters.children,
        infants: appliedFilters.infants,
      }),
    );
  };

  const syncFiltersToUrl = (nextFilters: CruiseSearchFiltersState) => {
    const aligned = alignCompanyLinerFilters(nextFilters, bookableCruises);
    const query = buildSearchParams(aligned);
    router.replace(query ? `/search?${query}` : "/search", { scroll: false });
  };

  const mergeFilterPatch = (
    current: CruiseSearchFiltersState,
    patch: Partial<CruiseSearchFiltersState>,
  ): CruiseSearchFiltersState => {
    const next = { ...current, ...patch };

    if ("liner" in patch && patch.liner) {
      const match = bookableCruises.find(
        (cruise) => cruise.liner_slug === patch.liner,
      );
      if (match?.cruise_title) {
        next.company = match.cruise_title;
      }
    }

    if ("company" in patch && patch.company !== current.company) {
      next.liner = "";
    }

    if ("year" in patch) {
      next.months = sanitizeSelectedMonths(next.months, next.year);
    }

    if ("dateFrom" in patch || "dateTo" in patch) {
      if (next.dateFrom || next.dateTo) {
        next.year = "Будь-коли";
      }
      const monthYear = effectiveMonthYear(
        next.year,
        next.dateFrom,
        next.dateTo,
      );
      next.months = sanitizeSelectedMonths(next.months, monthYear);
    }

    if ("currency" in patch && patch.currency) {
      const bounds = getSearchBounds(bookableCruises, patch.currency);
      next.priceMin = bounds.priceMin;
      next.priceMax = bounds.priceMax;
    }

    return next;
  };

  const updateFilters = (patch: Partial<CruiseSearchFiltersState>) => {
    const shouldSyncUrl =
      "newLinersOnly" in patch ||
      "sort" in patch ||
      "currency" in patch;

    setDraftFilters((current) => {
      const next = mergeFilterPatch(current, patch);

      if (shouldSyncUrl) {
        queueMicrotask(() => {
          startTransition(() => syncFiltersToUrl(next));
        });
      }

      return next;
    });
  };

  const scrollToResults = () => {
    window.setTimeout(() => {
      resultsAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  const applyFilters = () => {
    const monthYear = effectiveMonthYear(
      draftFilters.year,
      draftFilters.dateFrom,
      draftFilters.dateTo,
    );
    let next = {
      ...draftFilters,
      months: sanitizeSelectedMonths(draftFilters.months, monthYear),
      ...(draftFilters.dateFrom || draftFilters.dateTo
        ? { year: "Будь-коли" as const }
        : {}),
    };
    next = alignCompanyLinerFilters(next, bookableCruises);
    setDraftFilters(next);
    syncFiltersToUrl(next);
    scrollToResults();
  };

  const resetFilters = () => {
    const reset = createDefaultFilters(bookableCruises, DEFAULT_CURRENCY);
    setDraftFilters(reset);
    router.replace("/search", { scroll: false });
    scrollToResults();
  };

  const hasActiveFilters =
    appliedFilters.regions.length > 0 ||
    appliedFilters.company ||
    appliedFilters.liner ||
    (appliedFilters.year !== "Будь-коли" &&
      !appliedFilters.dateFrom &&
      !appliedFilters.dateTo) ||
    appliedFilters.months.length > 0 ||
    appliedFilters.duration !== "Будь-яка" ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo ||
    appliedFilters.priceMin > priceBounds.priceMin ||
    appliedFilters.priceMax < priceBounds.priceMax ||
    appliedFilters.newLinersOnly;

  const activeRegionLabel = appliedFilters.regions[0] || "";
  const activeLinerLabel =
    liners.find((item) => item.slug === appliedFilters.liner)?.name ||
    bookableCruises.find((c) => c.liner_slug === appliedFilters.liner)
      ?.liner_name ||
    "";

  const filtersDirty = useMemo(
    () =>
      buildSearchParams(draftFilters) !== buildSearchParams(appliedFilters),
    [draftFilters, appliedFilters],
  );

  return (
    <main className="bg-background pb-16 pt-28 sm:pt-32">
      <div className="section-frame">
        <div className="container-px mx-auto max-w-[1180px]">
          <div className="mb-6 sm:mb-8">
            <span className="section-badge">Пошук круїзів</span>
            <h1 className="text-h2 mt-5 text-[color:var(--color-black)]">
              Знайдіть свій ідеальний круїз
            </h1>
            <p className="text-body text-subtitle mt-4 max-w-2xl">
              Актуальні пропозиції від провідних круїзних компаній. Оберіть
              напрямок, дати та тривалість — ми покажемо найкращі варіанти.
            </p>
            {activeRegionLabel || activeLinerLabel || appliedFilters.company ? (
              <div className="mt-3 flex flex-col gap-1">
                {activeRegionLabel ? (
                  <p className="text-caption font-semibold text-[color:var(--color-brand)]">
                    Обраний напрямок: {activeRegionLabel}
                  </p>
                ) : null}
                {appliedFilters.company ? (
                  <p className="text-caption font-semibold text-[color:var(--color-brand)]">
                    Компанія: {appliedFilters.company}
                  </p>
                ) : null}
                {activeLinerLabel ? (
                  <p className="text-caption font-semibold text-[color:var(--color-brand)]">
                    Обраний лайнер: {activeLinerLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <CruiseSearchFilters
            filters={draftFilters}
            companies={companies}
            liners={liners}
            priceBoundMin={priceBounds.priceMin}
            priceBoundMax={priceBounds.priceMax}
            onChange={updateFilters}
            onApply={applyFilters}
            onReset={resetFilters}
          />

          {filtersDirty ? (
            <p className="text-caption mt-3 font-medium text-[color:var(--color-brand)]">
              Зміни у фільтрах ще не застосовані — натисніть «Застосувати», щоб
              оновити результати.
            </p>
          ) : null}

          {hasActiveFilters ? (
            <p className="text-caption mt-4 text-subtitle">
              Активні фільтри застосовано. Натисніть «Скинути», щоб побачити всі
              круїзи.
            </p>
          ) : null}

          <section
            id="search-results"
            ref={resultsAnchorRef}
            className="scroll-mt-28 mt-6 space-y-4 sm:mt-8"
          >
            <div className="space-y-4 rounded-card bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <CruiseSortControls
                  value={appliedFilters.sort}
                  onChange={(sort) => updateFilters({ sort })}
                />
                <CruiseCurrencyToggle
                  compact
                  value={appliedFilters.currency}
                  onChange={(currency) => updateFilters({ currency })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body text-subtitle">
              {catalogError ? (
                <span className="text-[color:var(--color-brand)]">
                  {catalogError}
                </span>
              ) : catalogTotal != null && results.length < catalogTotal ? (
                <>
                  Показано{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {results.length.toLocaleString("uk-UA")}
                  </span>{" "}
                  з{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {catalogTotal.toLocaleString("uk-UA")}
                  </span>{" "}
                  круїзів
                  {catalogSource === "live" ? (
                    <span className="text-caption"> · дані 4gates</span>
                  ) : null}
                </>
              ) : hasActiveFilters ? (
                <>
                  За вашим запитом знайдено{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {(catalogTotal ?? results.length).toLocaleString("uk-UA")}
                  </span>{" "}
                  {(catalogTotal ?? results.length) === 1
                    ? "круїз"
                    : (catalogTotal ?? results.length) >= 2 &&
                        (catalogTotal ?? results.length) <= 4
                      ? "круїзи"
                      : "круїзів"}
                  {catalogSource === "live" ? (
                    <span className="text-caption"> · дані 4gates</span>
                  ) : null}
                </>
              ) : (
                <>
                  Знайдено{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {(catalogTotal ?? results.length).toLocaleString("uk-UA")}
                  </span>{" "}
                  круїзів
                </>
              )}
            </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {showCatalogLoader ? (
              <CruiseInlineLoader
                label="Завантажуємо актуальні круїзи з оператора…"
                variant="block"
                className="col-span-full min-h-72 rounded-card bg-white"
              />
            ) : results.length ? (
              visibleResults.map((group) => (
                <CruiseSearchResultCard
                  key={group[0].key || itineraryGroupKey(group[0])}
                  cruise={group[0]}
                  departures={group}
                  currency={appliedFilters.currency}
                  onOpen={openCruise}
                />
              ))
            ) : (
              <div className="rounded-card bg-white px-6 py-12 text-center">
                <h2 className="text-h4 font-bold text-[color:var(--color-black)]">
                  Круїзів не знайдено
                </h2>
                <p className="text-body text-subtitle mt-3">
                  Спробуйте змінити фільтри або натисніть «Скинути», щоб
                  переглянути всі доступні круїзи.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="btn-primary mt-6"
                >
                  Показати всі круїзи
                </button>
              </div>
            )}
            </div>

            {hasMoreResults ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMoreResults}
                  disabled={catalogLoadingMore}
                  className="btn-secondary"
                >
                  {catalogLoadingMore ? "Завантаження…" : "Показати ще"}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
