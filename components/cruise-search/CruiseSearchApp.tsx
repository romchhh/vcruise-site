"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SEARCH_RESULTS_PAGE_SIZE } from "@/lib/cruise-search/constants";
import { FEATURED_CRUISE_COMPANIES } from "@/lib/cruise-search/companies";
import { filterCruises, sortCruises } from "@/lib/cruise-search/filter";
import {
  buildSearchParams,
  createDefaultFilters,
  parseSearchParams,
} from "@/lib/cruise-search/params";
import { sanitizeSelectedMonths } from "@/lib/cruise-search/month-helpers";
import { getSearchBounds, hasBookableDates } from "@/lib/cruise-search/utils";
import type {
  CruiseRecord,
  CruiseSearchFilters as CruiseSearchFiltersState,
} from "@/lib/cruise-search/types";
import CruiseBookingModal from "./CruiseBookingModal";
import CruiseSearchFilters from "./CruiseSearchFilters";
import CruiseSearchResultCard from "./CruiseSearchResultCard";

export default function CruiseSearchApp({
  cruises,
}: {
  cruises: CruiseRecord[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [bookingCruise, setBookingCruise] = useState<CruiseRecord | null>(null);

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
    return sortCruises(filtered, filters.sort, filters.currency);
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

  const hasMoreResults = visibleCount < results.length;

  const syncFiltersToUrl = (nextFilters: CruiseSearchFiltersState) => {
    const query = buildSearchParams(nextFilters);
    router.replace(query ? `/search?${query}` : "/search", { scroll: false });
  };

  const updateFilters = (patch: Partial<CruiseSearchFiltersState>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };

      if ("year" in patch) {
        next.months = sanitizeSelectedMonths(next.months, next.year);
      }

      if ("currency" in patch && patch.currency) {
        const bounds = getSearchBounds(bookableCruises, patch.currency);
        next.priceMin = bounds.priceMin;
        next.priceMax = bounds.priceMax;
      }

      if ("newLinersOnly" in patch) {
        const query = buildSearchParams(next);
        router.replace(query ? `/search?${query}` : "/search", { scroll: false });
      }

      return next;
    });
  };

  const applyFilters = () => {
    const next = {
      ...filters,
      months: sanitizeSelectedMonths(filters.months, filters.year),
    };
    setFilters(next);
    syncFiltersToUrl(next);
  };

  const resetFilters = () => {
    const reset = createDefaultFilters(bookableCruises, "NAT");
    setFilters(reset);
    router.replace("/search", { scroll: false });
  };

  const hasActiveFilters =
    filters.regions.length > 0 ||
    filters.company ||
    filters.liner ||
    filters.year !== "Будь-коли" ||
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

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {results.length ? (
              visibleResults.map((cruise) => (
                <CruiseSearchResultCard
                  key={cruise.key}
                  cruise={cruise}
                  currency={filters.currency}
                  onBook={setBookingCruise}
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
            <div className="mt-8 flex justify-center">
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
        </div>
      </div>
      <CruiseBookingModal
        cruise={bookingCruise}
        currency={filters.currency}
        onClose={() => setBookingCruise(null)}
      />
    </main>
  );
}
