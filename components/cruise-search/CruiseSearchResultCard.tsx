"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/cruise-search/constants";
import {
  cheapestPrice,
  formatDate,
  formatMoney,
  nearestDate,
} from "@/lib/cruise-search/utils";
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
  currency,
}: {
  cruise: CruiseRecord;
  currency: CurrencyCode;
}) {
  const [datesOpen, setDatesOpen] = useState(false);
  const price = cheapestPrice(cruise, currency);
  const symbol = CURRENCY_SYMBOL[currency];
  const nearDate = nearestDate(cruise);
  const route = cruise.route ?? [];
  const routePreview = route.slice(0, 3).join(" · ");
  const routeExtra = route.length > 3 ? ` +${route.length - 3}` : "";
  const bookingUrl = cruise.available_dates?.[0]?.booking_url;
  const nightsLabel = cruise.nights_str ?? `${cruise.nights} ночей`;

  return (
    <article className="flex h-full flex-col rounded-card bg-white p-4 sm:p-5">
      <span className="chip chip-muted-brand w-fit">{cruise.region_name}</span>

      <h3 className="text-h4 mt-3 font-bold text-[color:var(--color-black)]">
        {cruise.liner_name}
      </h3>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-card-inner bg-[color:var(--color-surface-muted)]">
        {cruise.liner_logo ? (
          <Image
            src={cruise.liner_logo}
            alt={cruise.liner_name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-caption text-subtitle">
            {cruise.liner_name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <p className="text-caption font-medium text-white">
            {cruise.cruise_title}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow
          label={formatDate(nearDate)}
          value={nightsLabel}
          withDivider={false}
        />
        <InfoRow
          label="Маршрут"
          value={`${routePreview}${routeExtra}`}
        />
        <div className="divider pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-caption max-w-[120px] leading-snug text-[color:var(--color-silver)]">
              Ціна від / за особу
            </span>
            <span className="text-h4 font-bold leading-none text-[color:var(--color-black)]">
              {formatMoney(price)} {symbol}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {bookingUrl ? (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-primary--block"
          >
            Забронювати
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <button type="button" className="btn-primary btn-primary--block">
            Детальніше
          </button>
        )}
        {(cruise.available_dates?.length ?? 0) > 1 ? (
          <button
            type="button"
            onClick={() => setDatesOpen((open) => !open)}
            className="btn-secondary btn-secondary--block"
          >
            {datesOpen
              ? "Сховати дати"
              : `Усі дати (${cruise.available_dates?.length ?? 0})`}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${datesOpen ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>

      {datesOpen ? (
        <div className="divider mt-4 border-t border-[color:var(--color-divider)] pt-4">
          <div className="space-y-3">
            {(cruise.available_dates ?? [])
              .slice()
              .sort((left, right) =>
                (left.date ?? "").localeCompare(right.date ?? "")
              )
              .map((item) => {
                const cabins = Object.entries(item.cabins ?? {})
                  .map(
                    ([name, prices]) =>
                      `${name}: ${formatMoney(prices?.[currency])} ${symbol}`
                  )
                  .join(" · ");

                return (
                  <div
                    key={item.date}
                    className="border-t border-[color:var(--color-divider)] pt-3 first:border-t-0 first:pt-0"
                  >
                    <p className="text-caption font-semibold text-[color:var(--color-black)]">
                      {formatDate(item.date)}
                    </p>
                    <p className="text-caption mt-1 text-subtitle">
                      {cabins || "—"}
                    </p>
                    {item.booking_url ? (
                      <a
                        href={item.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption mt-1 inline-block font-semibold text-[color:var(--color-brand)] hover:underline"
                      >
                        Перейти
                      </a>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
