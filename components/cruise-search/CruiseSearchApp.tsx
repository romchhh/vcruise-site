"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { FEATURED_CRUISE_COMPANIES } from "@/lib/cruise-search/companies";
import { filterCruises, sortCruises } from "@/lib/cruise-search/filter";
import {
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
  const bookableCruises = useMemo(
    () => cruises.filter((cruise) => hasBookableDates(cruise)),
    [cruises]
  );

  const initialFilters = useMemo(() => {
    const params: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return parseSearchParams(params, bookableCruises);
  }, [bookableCruises, searchParams]);

  const [filters, setFilters] =
    useState<CruiseSearchFiltersState>(initialFilters);

  const priceBounds = useMemo(
    () => getSearchBounds(bookableCruises, filters.currency),
    [bookableCruises, filters.currency],
  );

  const defaults = useMemo(
    () => createDefaultFilters(bookableCruises, filters.currency),
    [bookableCruises, filters.currency],
  );
  const [visibleCount, setVisibleCount] = useState(SEARCH_RESULTS_PAGE_SIZE);
  const pendingScrollRef = useRef<number | null>(null);
  const listQuery = searchParams.toString();

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

    router.replace(
      buildCruiseDetailPath(key, {
        listQuery: nextListQuery,
        sailing: deepLinkDate,
        currency: initialFilters.currency,
        adults: initialFilters.adults > 0 ? initialFilters.adults : 2,
        children: initialFilters.children,
        infants: initialFilters.infants,
      }),
    );
  }, [
    bookableCruises,
    deepLinkCruiseKey,
    deepLinkDate,
    initialFilters.adults,
    initialFilters.children,
    initialFilters.currency,
    initialFilters.infants,
    router,
    searchParams,
  ]);

  useEffect(() => {
    const restored = restoreSearchListState(listQuery);
    if (!restored) return;

    if (restored.visibleCount > SEARCH_RESULTS_PAGE_SIZE) {
      setVisibleCount(restored.visibleCount);
    }
    pendingScrollRef.current = restored.scrollY;
    clearSearchListState();
  }, [listQuery]);

  const companies = useMemo(() => {
    const available = new Set(
      bookableCruises.map((cruise) => cruise.cruise_title),
    );
    const list: string[] = FEATURED_CRUISE_COMPANIES.filter((company) =>
      available.has(company),
    );
    // Keep a company from deep-links even if it's outside the featured list.
    if (
      filters.company &&
      !list.includes(filters.company) &&
      available.has(filters.company)
    ) {
      list.push(filters.company);
    }
    return list.sort((a, b) => a.localeCompare(b, "uk"));
  }, [bookableCruises, filters.company]);

  const liners = useMemo(() => {
    const pool = filters.company
      ? bookableCruises.filter(
          (cruise) => cruise.cruise_title === filters.company
        )
      : bookableCruises;

    const map = new Map(
      pool
        .filter((cruise) => cruise.liner_slug && cruise.liner_name)
        .map((cruise) => [cruise.liner_slug, cruise.liner_name!]),
    );

    // Ensure the selected liner from URL is always visible in the dropdown.
    if (filters.liner && !map.has(filters.liner)) {
      const match = bookableCruises.find(
        (cruise) => cruise.liner_slug === filters.liner,
      );
      if (match?.liner_name) {
        map.set(filters.liner, match.liner_name);
      }
    }

    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "uk"));
  }, [bookableCruises, filters.company, filters.liner]);

  const results = useMemo(() => {
    const filtered = filterCruises(bookableCruises, filters);
    return sortCruises(
      filtered,
      filters.sort,
      filters.currency,
      filters.dateFrom,
      filters.dateTo,
    );
  }, [bookableCruises, filters]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setVisibleCount(SEARCH_RESULTS_PAGE_SIZE);
  }, [results]);

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  useEffect(() => {
    if (pendingScrollRef.current == null) return;
    const scrollY = pendingScrollRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      pendingScrollRef.current = null;
    });
  }, [visibleCount, results.length]);

  const hasMoreResults = visibleCount < results.length;

  const openCruise = (cruise: CruiseRecord, preferredDate?: string) => {
    saveSearchListState({
      listQuery,
      scrollY: window.scrollY,
      visibleCount,
    });

    router.push(
      buildCruiseDetailPath(cruise.key, {
        listQuery,
        sailing: preferredDate,
        currency: filters.currency,
        adults: filters.adults > 0 ? filters.adults : 2,
        children: filters.children,
        infants: filters.infants,
      }),
    );
  };

  const syncFiltersToUrl = (nextFilters: CruiseSearchFiltersState) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `/search?${query}` : "/search", { scroll: false });
  };

  const mergeFilterPatch = (
    current: CruiseSearchFiltersState,
    patch: Partial<CruiseSearchFiltersState>,
  ): CruiseSearchFiltersState => {
    const next = { ...current, ...patch };

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

    setFilters((current) => {
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
      filters.year,
      filters.dateFrom,
      filters.dateTo,
    );
    const next = {
      ...filters,
      months: sanitizeSelectedMonths(filters.months, monthYear),
      ...(filters.dateFrom || filters.dateTo ? { year: "Будь-коли" as const } : {}),
    };
    setFilters(next);
    syncFiltersToUrl(next);
    scrollToResults();
  };

  const resetFilters = () => {
    const reset = createDefaultFilters(bookableCruises, DEFAULT_CURRENCY);
    setFilters(reset);
    router.replace("/search", { scroll: false });
    scrollToResults();
  };

  const hasActiveFilters =
    filters.regions.length > 0 ||
    filters.company ||
    filters.liner ||
    (filters.year !== "Будь-коли" &&
      !filters.dateFrom &&
      !filters.dateTo) ||
    filters.months.length > 0 ||
    filters.duration !== "Будь-яка" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.priceMin > priceBounds.priceMin ||
    filters.priceMax < priceBounds.priceMax ||
    filters.newLinersOnly;

  const activeRegionLabel = filters.regions[0] || "";
  const activeLinerLabel =
    liners.find((item) => item.slug === filters.liner)?.name || "";

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
            {activeRegionLabel || activeLinerLabel || filters.company ? (
              <div className="mt-3 flex flex-col gap-1">
                {activeRegionLabel ? (
                  <p className="text-caption font-semibold text-[color:var(--color-brand)]">
                    Обраний напрямок: {activeRegionLabel}
                  </p>
                ) : null}
                {filters.company ? (
                  <p className="text-caption font-semibold text-[color:var(--color-brand)]">
                    Компанія: {filters.company}
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
            filters={filters}
            companies={companies}
            liners={liners}
            priceBoundMin={priceBounds.priceMin}
            priceBoundMax={priceBounds.priceMax}
            onChange={updateFilters}
            onApply={applyFilters}
            onReset={resetFilters}
          />

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
                  value={filters.sort}
                  onChange={(sort) => updateFilters({ sort })}
                />
                <CruiseCurrencyToggle
                  compact
                  value={filters.currency}
                  onChange={(currency) => updateFilters({ currency })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body text-subtitle">
              {results.length > visibleResults.length ? (
                <>
                  Показано{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {visibleResults.length.toLocaleString("uk-UA")}
                  </span>{" "}
                  з{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {results.length.toLocaleString("uk-UA")}
                  </span>{" "}
                  круїзів
                </>
              ) : (
                <>
                  Знайдено{" "}
                  <span className="font-semibold text-[color:var(--color-black)]">
                    {results.length.toLocaleString("uk-UA")}
                  </span>{" "}
                  круїзів із {bookableCruises.length.toLocaleString("uk-UA")}
                </>
              )}
            </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {results.length ? (
              visibleResults.map((cruise) => (
                <CruiseSearchResultCard
                  key={cruise.key}
                  cruise={cruise}
                  currency={filters.currency}
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
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
                  onClick={() =>
                    setVisibleCount((count) =>
                      Math.min(count + SEARCH_RESULTS_PAGE_SIZE, results.length)
                    )
                  }
                  className="btn-secondary"
                >
                  Показати ще
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
