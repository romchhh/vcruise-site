"use client";

import CruiseLinerImage from "./CruiseLinerImage";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CURRENCY_SYMBOL,
  DEFAULT_CURRENCY,
} from "@/lib/cruise-search/constants";
import type { CruiseDetailQuery } from "@/lib/cruise-search/cruise-detail-url";
import { buildSearchHrefFromListQuery } from "@/lib/cruise-search/cruise-detail-url";
import { prefetchCruiseOffers } from "@/lib/cruise-search/fetch-cruise-offers-client";
import { resolveBookingUrl } from "@/lib/cruise-search/booking-url";
import {
  addDaysIso,
  cheapestPriceOnDate,
  embarkationPort,
  formatDate,
  formatMoney,
  getUpcomingDates,
} from "@/lib/cruise-search/utils";
import { countryCodeFromPlace } from "@/lib/cruise-search/country-flag";
import type { CruiseRecord, CurrencyCode } from "@/lib/cruise-search/types";
import CountryFlag from "./CountryFlag";
import CruiseBookingModal from "./CruiseBookingModal";
import CruiseCurrencyToggle from "./CruiseCurrencyToggle";
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

function formatRouteSummary(stops: RouteStop[]) {
  const ports = stops.filter((stop) => stop.kind === "port");
  if (ports.length === 0) return "";
  if (ports.length === 1) return ports[0].name;
  if (ports.length === 2) return `${ports[0].name} → ${ports[1].name}`;
  return `${ports[0].name} → … → ${ports[ports.length - 1].name}`;
}

const ROUTE_COLLAPSE_THRESHOLD = 5;

export default function CruiseDetailApp({
  cruise,
  similarCruises,
  detailQuery,
}: {
  cruise: CruiseRecord;
  similarCruises: CruiseRecord[];
  detailQuery: CruiseDetailQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnHref = buildSearchHrefFromListQuery(detailQuery.from);
  const currency = detailQuery.currency;
  const symbol = CURRENCY_SYMBOL[currency];

  const setCurrency = (next: CurrencyCode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_CURRENCY) params.delete("currency");
    else params.set("currency", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const [routeExpanded, setRouteExpanded] = useState(false);

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

  const catalogPrice = cheapestPriceOnDate(cruise, preferredDate, currency);
  const [quotedFrom, setQuotedFrom] = useState<number | null | undefined>(
    undefined,
  );
  const highlightPrice = quotedFrom === undefined ? catalogPrice : quotedFrom;
  const fromPort = embarkationPort(cruise);
  const stops = useMemo(() => routeStops(cruise.route ?? []), [cruise.route]);
  const routeSummary = useMemo(() => formatRouteSummary(stops), [stops]);
  const routeIsLong = stops.length >= ROUTE_COLLAPSE_THRESHOLD;
  const showCompactRoute = routeIsLong && !routeExpanded;
  const nightsLabel =
    cruise.nights_str ?? (cruise.nights ? `${cruise.nights} ночей` : "");

  useEffect(() => {
    setQuotedFrom(undefined);
  }, [currency, preferredDate]);

  useEffect(() => {
    const preferredUrl = resolveBookingUrl(cruise, preferredDate);
    const alreadyHasOffers = upcomingDates.some(
      (item) => item.date === preferredDate && (item.offers?.length ?? 0) > 0,
    );
    if (!preferredUrl || alreadyHasOffers) return;
    void prefetchCruiseOffers(preferredUrl);
  }, [cruise, preferredDate, upcomingDates]);

  return (
    <main className="overflow-x-hidden bg-background pb-16 pt-28 sm:pt-32">
      <div className="section-frame">
        <div className="container-px mx-auto max-w-[1180px] min-w-0">
          <Link
            href={returnHref}
            scroll={false}
            className="text-caption inline-flex items-center gap-2 font-semibold text-[color:var(--color-brand)] hover:underline"
          >
            ← Назад до результатів пошуку
          </Link>

          <header className="mt-4 overflow-hidden rounded-card bg-white">
            <div className="grid sm:grid-cols-[minmax(260px,42%)_minmax(0,1fr)]">
              <div className="relative aspect-[16/10] bg-[color:var(--color-surface-muted)] sm:aspect-auto sm:min-h-[260px]">
                {cruise.liner_logo ? (
                  <CruiseLinerImage
                    src={cruise.liner_logo}
                    alt={cruise.liner_name}
                    sizes="(max-width: 640px) 100vw, 480px"
                    priority
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-brand)] to-[color:var(--color-brand-dark,#085a9c)]"
                    aria-hidden
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
                <div className="min-w-0">
                  <span className="chip chip-muted-brand">{cruise.region_name}</span>
                  <h1 className="text-h3 mt-2 font-bold text-[color:var(--color-black)]">
                    {cruise.liner_name}
                  </h1>
                  <p className="text-caption mt-1 text-subtitle">
                    {cruise.cruise_title}
                  </p>
                  {routeSummary ? (
                    <p className="text-caption mt-2 line-clamp-2 font-semibold leading-snug text-[color:var(--color-black)]">
                      {routeSummary}
                    </p>
                  ) : null}
                </div>

                <dl className="mt-4 grid gap-2 border-t border-[color:var(--color-line)] pt-4 text-caption">
                  <div className="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                    <dt className="text-[color:var(--color-silver)]">Відправлення</dt>
                    <dd className="font-semibold text-[color:var(--color-black)]">
                      {formatDate(preferredDate)}
                      {cruise.nights
                        ? ` → ${formatDate(addDaysIso(preferredDate, cruise.nights))}`
                        : ""}
                    </dd>
                  </div>
                  {nightsLabel ? (
                    <div className="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)] gap-x-3">
                      <dt className="text-[color:var(--color-silver)]">Тривалість</dt>
                      <dd className="font-semibold text-[color:var(--color-black)]">
                        {nightsLabel}
                      </dd>
                    </div>
                  ) : null}
                  {fromPort ? (
                    <div className="grid grid-cols-[minmax(6.5rem,auto)_minmax(0,1fr)] gap-x-3">
                      <dt className="text-[color:var(--color-silver)]">Порт</dt>
                      <dd className="font-semibold text-[color:var(--color-black)]">
                        {fromPort}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 rounded-card-inner bg-[color:var(--color-surface-muted)] p-3.5 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <CruiseCurrencyToggle
                      compact
                      value={currency}
                      onChange={setCurrency}
                    />
                    <div className="min-w-0 sm:text-right">
                      <p className="text-h3 font-bold tabular-nums leading-none text-[color:var(--color-brand)]">
                        {highlightPrice == null
                          ? "…"
                          : `${formatMoney(highlightPrice)} ${symbol}`}
                      </p>
                      <p className="text-caption mt-1.5 text-subtitle">від · за каюту</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-4" id="cabin-offers">
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
              onFromPrice={setQuotedFrom}
              onClose={() => {
                // Page variant uses the contact modal.
              }}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-card bg-white px-5 py-5 sm:px-6">
                {stops.length ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-caption text-[color:var(--color-silver)]">
                        Маршрут
                      </p>
                      {routeIsLong ? (
                        <button
                          type="button"
                          className="text-caption font-semibold text-[color:var(--color-brand)] hover:underline"
                          onClick={() => setRouteExpanded((value) => !value)}
                        >
                          {routeExpanded ? "Згорнути" : "Показати повністю"}
                        </button>
                      ) : null}
                    </div>
                    {showCompactRoute ? (
                      <p className="text-body mt-2 line-clamp-2 font-semibold leading-snug text-[color:var(--color-black)]">
                        {routeSummary}
                      </p>
                    ) : (
                    <ol className="mt-3">
                      {stops.map((stop, index) => (
                        <li
                          key={`${stop.kind}-${index}`}
                          className="flex gap-3"
                        >
                          <span
                            className="flex w-3 flex-col items-center"
                            aria-hidden
                          >
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
                          <div
                            className={index < stops.length - 1 ? "pb-3" : ""}
                          >
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
                    )}
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

          <SimilarCruisesSection
            similarCruises={similarCruises}
            detailQuery={detailQuery}
          />
        </div>
      </div>
    </main>
  );
}
