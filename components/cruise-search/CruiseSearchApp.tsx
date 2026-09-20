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
import type {
  CruiseRecord,
  CruiseSearchFilters as CruiseSearchFiltersState,
} from "@/lib/cruise-search/types";
import CruiseSearchFilters from "./CruiseSearchFilters";
import CruiseSearchResultCard from "./CruiseSearchResultCard";

export default function CruiseSearchApp({
  cruises,
}: {
  cruises: CruiseRecord[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaults = useMemo(() => createDefaultFilters(cruises), [cruises]);

  const initialFilters = useMemo(() => {
    const params: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return parseSearchParams(params, cruises);
  }, [cruises, searchParams]);

  const [filters, setFilters] =
    useState<CruiseSearchFiltersState>(initialFilters);
  const [visibleCount, setVisibleCount] = useState(SEARCH_RESULTS_PAGE_SIZE);

  const companies = useMemo(() => {
    const available = new Set(cruises.map((cruise) => cruise.cruise_title));
    return FEATURED_CRUISE_COMPANIES.filter((company) =>
      available.has(company)
    );
  }, [cruises]);

  const liners = useMemo(() => {
    const pool = filters.company
      ? cruises.filter((cruise) => cruise.cruise_title === filters.company)
      : cruises;

    return [...new Map(
      pool
        .filter((cruise) => cruise.liner_slug && cruise.liner_name)
        .map((cruise) => [cruise.liner_slug, cruise.liner_name])
    ).entries()]
      .map(([slug, name]) => ({ slug, name: name! }))
      .sort((left, right) => left.name.localeCompare(right.name, "uk"));
  }, [cruises, filters.company]);

  const results = useMemo(() => {
    const filtered = filterCruises(cruises, filters);
    return sortCruises(filtered, filters.sort, filters.currency);
  }, [cruises, filters]);

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
      if ("newLinersOnly" in patch) {
        const query = buildSearchParams(next);
        router.replace(query ? `/search?${query}` : "/search", { scroll: false });
      }
      return next;
    });
  };

  const applyFilters = () => {
    syncFiltersToUrl(filters);
  };

  const resetFilters = () => {
    setFilters(defaults);
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
    filters.dateTo;

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
          </div>

          <CruiseSearchFilters
            filters={filters}
            companies={companies}
            liners={liners}
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
                  круїзів із {cruises.length.toLocaleString("uk-UA")}
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
    </main>
  );
}
