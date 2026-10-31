"use client";

import CruiseLinerImage from "./CruiseLinerImage";
import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CURRENCY_OPTIONS,
  CURRENCY_SYMBOL,
} from "@/lib/cruise-search/constants";
import {
  cheapestPriceOnDate,
  embarkationPort,
  formatDate,
  formatMoney,
} from "@/lib/cruise-search/utils";
import { resolveBookingUrl } from "@/lib/cruise-search/booking-url";
import { prefetchCruiseOffers } from "@/lib/cruise-search/fetch-cruise-offers-client";
import type { CruiseRecord, CurrencyCode } from "@/lib/cruise-search/types";

function InfoRow({
  label,
  value,
  withDivider = true,
}: {
  label: string;
  value: string;
  withDivider?: boolean;
}) {
  return (
    <div className={withDivider ? "divider pt-3" : ""}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-[color:var(--color-silver)]">
          {label}
        </span>
        <span className="text-caption text-right text-[color:var(--color-black)]">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function CruiseSearchResultCard({
  cruise,
  departures,
  currency,
  onOpen,
}: {
  cruise: CruiseRecord;
  /** Same route, one entry per departure. First item is the card headline. */
  departures?: CruiseRecord[];
  currency: CurrencyCode;
  onOpen: (cruise: CruiseRecord, preferredDate?: string) => void;
}) {
  const [datesOpen, setDatesOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const prefetchedKeyRef = useRef("");
  const sailings = useMemo(
    () => (departures?.length ? departures : [cruise]),
    [cruise, departures],
  );
  const headline = sailings[0];
  const datesInOrder = useMemo(
    () =>
      [...sailings].sort((left, right) =>
        (left.base_date_start ?? "").localeCompare(right.base_date_start ?? ""),
      ),
    [sailings],
  );
  const highlightDate = headline.base_date_start ?? null;
  const price = cheapestPriceOnDate(headline, highlightDate, currency);
  const symbol = CURRENCY_SYMBOL[currency];
  const allCurrencyPrices = useMemo(
    () =>
      CURRENCY_OPTIONS.map(({ code }) => ({
        code,
        amount: cheapestPriceOnDate(headline, highlightDate, code),
      })),
    [headline, highlightDate],
  );
  const secondaryPrices = allCurrencyPrices.filter(
    (item) =>
      item.code !== currency && item.amount != null && item.amount > 0,
  );
  const fromPort = embarkationPort(headline);
  const route = headline.route ?? [];
  const routePreview = route.slice(0, 3).join(" · ");
  const routeExtra = route.length > 3 ? ` +${route.length - 3}` : "";
  const nightsLabel = headline.nights_str ?? `${headline.nights} ночей`;

  const prefetchOffers = useCallback(() => {
    const bookingUrl = resolveBookingUrl(headline, highlightDate);
    if (!bookingUrl) return;

    if (prefetchedKeyRef.current === bookingUrl) return;
    prefetchedKeyRef.current = bookingUrl;

    prefetchCruiseOffers(bookingUrl);
  }, [headline, highlightDate]);

  const openDetail = () => onOpen(headline, highlightDate ?? undefined);

  return (
    <article
      ref={cardRef}
      className="flex h-full flex-col rounded-card bg-white p-4 sm:p-5"
    >
      <button
        type="button"
        onClick={openDetail}
        className="flex flex-1 flex-col text-left"
      >
        <span className="chip chip-muted-brand w-fit">{headline.region_name}</span>

        <h3 className="text-h4 mt-3 font-bold text-[color:var(--color-black)]">
          {headline.liner_name}
        </h3>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-card-inner bg-[color:var(--color-surface-muted)]">
        {headline.liner_logo ? (
          <CruiseLinerImage
            src={headline.liner_logo}
            alt={headline.liner_name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-caption text-subtitle">
            {headline.liner_name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <p className="text-caption font-medium text-white">
            {headline.cruise_title}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow
          label={formatDate(highlightDate)}
          value={nightsLabel}
          withDivider={false}
        />
        {fromPort ? (
          <InfoRow label="Відправлення" value={fromPort} />
        ) : null}
        <InfoRow
          label="Маршрут"
          value={`${routePreview}${routeExtra}`}
        />
        <div className="divider pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-caption max-w-[120px] leading-snug text-[color:var(--color-silver)]">
              Ціна від / за каюту
            </span>
            <div className="text-right">
              <span className="text-h4 font-bold leading-none text-[color:var(--color-black)]">
                {formatMoney(price)} {symbol}
              </span>
              {secondaryPrices.length ? (
                <p className="text-caption mt-1.5 text-subtitle">
                  {secondaryPrices
                    .map(
                      (item) =>
                        `${formatMoney(item.amount)} ${CURRENCY_SYMBOL[item.code]}`,
                    )
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </button>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onPointerEnter={prefetchOffers}
          onFocus={prefetchOffers}
          onClick={openDetail}
          className="btn-primary btn-primary--block"
        >
          Забронювати
        </button>
        {datesInOrder.length > 1 ? (
          <button
            type="button"
            onClick={() => setDatesOpen((open) => !open)}
            className="btn-secondary btn-secondary--block"
          >
            {datesOpen
              ? "Сховати дати"
              : `Усі дати (${datesInOrder.length})`}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${datesOpen ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>

      {datesOpen ? (
        <div className="divider mt-4 border-t border-[color:var(--color-divider)] pt-4">
          <div className="space-y-3">
            {datesInOrder.map((item) => {
              const date = item.base_date_start ?? "";
              const amount = cheapestPriceOnDate(item, date, currency);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onOpen(item, date || undefined)}
                  className="block w-full border-t border-[color:var(--color-divider)] pt-3 text-left first:border-t-0 first:pt-0"
                >
                  <p className="text-caption font-semibold text-[color:var(--color-black)]">
                    {formatDate(date)}
                  </p>
                  <p className="text-caption mt-1 text-subtitle">
                    {amount != null
                      ? `${formatMoney(amount)} ${symbol}`
                      : "—"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
