"use client";

import CruiseLinerImage from "./CruiseLinerImage";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CURRENCY_SYMBOL } from "@/lib/cruise-search/constants";
import type { CruiseDetailQuery } from "@/lib/cruise-search/cruise-detail-url";
import { buildSearchHrefFromListQuery } from "@/lib/cruise-search/cruise-detail-url";
import {
  prefetchCruiseOffers,
} from "@/lib/cruise-search/fetch-cruise-offers-client";
import { resolveBookingUrl } from "@/lib/cruise-search/booking-url";
import {
  cheapestPriceOnDate,
  embarkationPort,
  formatDate,
  formatMoney,
  getUpcomingDates,
} from "@/lib/cruise-search/utils";
import { countryCodeFromPlace } from "@/lib/cruise-search/country-flag";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import CountryFlag from "./CountryFlag";
import CruiseBookingModal from "./CruiseBookingModal";
import SimilarCruisesSection from "./SimilarCruisesSection";

type RouteStop =
  | { kind: "port"; name: string; place: string }
  | { kind: "sea"; days: number };

function isSeaDay(stop: string) {
  const name = stop.split(",")[0]?.trim() ?? "";
  return name === "В морі" || name.startsWith("...") || name.startsWith("…");
}

function routeStops(route: string[]): RouteStop[] {
  const stops: RouteStop[] = [];
  for (const raw of route) {
    if (isSeaDay(raw)) {
      const last = stops[stops.length - 1];
      if (last?.kind === "sea") last.days += 1;
      else stops.push({ kind: "sea", days: 1 });
      continue;
    }
    const [name, ...rest] = raw.split(",");
    stops.push({
      kind: "port",
      name: name.trim(),
      place: rest.join(",").trim(),
    });
  }
  return stops;
}

function CountryPlace({ place }: { place: string }) {
  const code = countryCodeFromPlace(place);
  return (
    <p className="text-caption flex items-center gap-1.5 text-subtitle">
      {code ? <CountryFlag code={code} /> : null}
      <span>{place}</span>
    </p>
  );
}

function seaDaysLabel(days: number) {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (days === 1) return "День у морі";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${days} дні в морі`;
  }
  return `${days} днів у морі`;
}

export default function CruiseDetailApp({
  cruise,
  similarCruises,
  detailQuery,
}: {
  cruise: CruiseRecord;
  similarCruises: CruiseRecord[];
  detailQuery: CruiseDetailQuery;
}) {
  const returnHref = buildSearchHrefFromListQuery(detailQuery.from);
  const currency = detailQuery.currency;
  const symbol = CURRENCY_SYMBOL[currency];

  const upcomingDates = useMemo(() => getUpcomingDates(cruise), [cruise]);
  const preferredDate = useMemo(() => {
    if (
      detailQuery.sailing &&
      upcomingDates.some((item) => item.date === detailQuery.sailing)
    ) {
      return detailQuery.sailing;
    }
    return upcomingDates[0]?.date ?? "";
  }, [detailQuery.sailing, upcomingDates]);

  const highlightPrice = cheapestPriceOnDate(cruise, preferredDate, currency);
  const fromPort = embarkationPort(cruise);
  const stops = useMemo(() => routeStops(cruise.route ?? []), [cruise.route]);
  const nightsLabel = cruise.nights_str ?? (cruise.nights ? `${cruise.nights} ночей` : "");

  useEffect(() => {
    const preferredUrl = resolveBookingUrl(cruise, preferredDate);
    const alreadyHasOffers = upcomingDates.some(
      (item) => item.date === preferredDate && (item.offers?.length ?? 0) > 0,
    );
    if (!preferredUrl || alreadyHasOffers) return;
    void prefetchCruiseOffers(preferredUrl);
  }, [cruise, preferredDate, upcomingDates]);

  return (
    <main className="bg-background pb-16 pt-28 sm:pt-32">
      <div className="section-frame">
        <div className="container-px mx-auto max-w-[1180px]">
          <Link
            href={returnHref}
            className="text-caption inline-flex items-center gap-2 font-semibold text-[color:var(--color-brand)] hover:underline"
          >
            ← Назад до результатів пошуку
          </Link>

          <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-8">
            <div className="min-w-0 overflow-hidden rounded-card bg-white">
              <div className="relative aspect-[16/9] bg-[color:var(--color-surface-muted)] lg:aspect-[2/1]">
                {cruise.liner_logo ? (
                  <CruiseLinerImage
                    src={cruise.liner_logo}
                    alt={cruise.liner_name}
                    sizes="(max-width: 1024px) 100vw, 720px"
                    priority
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-8">
                  <span className="chip chip-muted-brand bg-white/90">
                    {cruise.region_name}
                  </span>
                  <h1 className="text-h2 mt-3 font-bold text-white">
                    {cruise.liner_name}
                  </h1>
                  <p className="text-body mt-1 text-white/90">
                    {cruise.cruise_title}
                  </p>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 lg:px-8 lg:py-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card bg-[color:var(--color-surface-muted)] px-4 py-3.5">
                    <p className="text-caption text-[color:var(--color-silver)]">
                      Найближча дата
                    </p>
                    <p className="text-body mt-1 font-bold text-[color:var(--color-black)]">
                      {formatDate(preferredDate)}
                    </p>
                    {nightsLabel ? (
                      <p className="text-caption mt-0.5 text-subtitle">
                        {nightsLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-card bg-[color:var(--color-brand-light)] px-4 py-3.5">
                    <p className="text-caption text-[color:var(--color-silver)]">
                      Ціна від
                    </p>
                    <p className="text-h4 mt-1 font-bold leading-none text-[color:var(--color-brand)]">
                      {formatMoney(highlightPrice)} {symbol}
                    </p>
                    <p className="text-caption mt-1.5 text-subtitle">за каюту</p>
                  </div>
                </div>

                {fromPort ? (
                  <div className="mt-5 border-t border-[color:var(--color-line)] pt-5">
                    <p className="text-caption text-[color:var(--color-silver)]">
                      Відправлення
                    </p>
                    <p className="text-body mt-1 font-semibold text-[color:var(--color-black)]">
                      {fromPort}
                    </p>
                  </div>
                ) : null}

                {stops.length ? (
                  <div className="mt-5 border-t border-[color:var(--color-line)] pt-5">
                    <p className="text-caption text-[color:var(--color-silver)]">
                      Маршрут
                    </p>
                    <ol className="mt-3">
                      {stops.map((stop, index) => (
                        <li
                          key={`${stop.kind}-${index}`}
                          className="flex gap-3"
                        >
                          <span className="flex w-3 flex-col items-center" aria-hidden>
                            <span
                              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                stop.kind === "sea"
                                  ? "bg-[color:var(--color-line)]"
                                  : "bg-[color:var(--color-brand)]"
                              }`}
                            />
                            {index < stops.length - 1 ? (
                              <span className="mt-1 w-px flex-1 bg-[color:var(--color-line)]" />
                            ) : null}
                          </span>
                          <div className={index < stops.length - 1 ? "pb-3" : ""}>
                            {stop.kind === "sea" ? (
                              <p className="text-caption text-[color:var(--color-silver)]">
                                {seaDaysLabel(stop.days)}
                              </p>
                            ) : (
                              <>
                                <p className="text-caption font-semibold text-[color:var(--color-black)]">
                                  {stop.name}
                                </p>
                                {stop.place ? (
                                  <CountryPlace place={stop.place} />
                                ) : null}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {upcomingDates.length > 1 ? (
                  <p className="text-caption mt-5 text-[color:var(--color-silver)]">
                    Ще {upcomingDates.length - 1}{" "}
                    {upcomingDates.length - 1 === 1 ? "дата" : "дат"} — можна
                    змінити в блоці бронювання.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 lg:mt-0 lg:sticky lg:top-28">
              <CruiseBookingModal
                variant="page"
                cruise={cruise}
                currency={currency}
                preferredDate={preferredDate}
                initialGuests={{
                  adults: detailQuery.adults,
                  children: detailQuery.children,
                  infants: detailQuery.infants,
                }}
                onClose={() => {
                  // Page variant uses contact modal; no-op for back arrow removal.
                }}
              />
            </div>
          </div>

          <SimilarCruisesSection
            similarCruises={similarCruises}
            detailQuery={detailQuery}
          />
        </div>
      </div>
    </main>
  );
}
