"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDisplayPrice } from "@/lib/cruise-search/format-display-price";
import { priceInCurrency } from "@/lib/cruise-search/currency";
import type { HotDeal } from "@/types";
import { useHomeDisplayCurrency } from "./HomeDisplayCurrencyProvider";

function nightsLabel(nights: number) {
  const n = Math.max(nights, 1);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ніч`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} ночі`;
  }
  return `${n} ночей`;
}

export default function HotDealCard({ deal }: { deal: HotDeal }) {
  const { currency } = useHomeDisplayCurrency();
  const price = priceInCurrency(deal.prices, currency, deal.price);
  const originalPrice = priceInCurrency(
    deal.originalPrices,
    currency,
    deal.originalPrice,
  );

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-card bg-white">
      <div className="relative aspect-[5/4] shrink-0 overflow-hidden rounded-b-card-inner sm:aspect-[16/10]">
        <Image
          src={deal.image}
          alt={deal.title}
          fill
          className="object-cover object-[50%_70%]"
          sizes="(max-width: 1024px) 92vw, 33vw"
          unoptimized={
            deal.image.startsWith("http") || deal.image.startsWith("/api/media/")
          }
        />
        <div
          className="absolute inset-x-2 top-2 z-10 flex flex-col items-start gap-1 sm:inset-x-3 sm:top-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2"
        >
          <span
            className="type-overlay-badge inline-flex max-w-full items-center gap-1 rounded-full bg-[#1A1A1A] px-2 py-1 text-white max-sm:text-[0.6875rem] max-sm:leading-tight sm:gap-1.5 sm:px-3 sm:py-1.5"
          >
            <span
              className="shrink-0 text-base leading-none sm:text-lg"
              aria-hidden
            >
              🔥
            </span>
            <span className="min-w-0 text-pretty">
              Гаряча пропозиція
              {deal.linerName ? (
                <>
                  <span className="mx-1 opacity-70" aria-hidden>·</span>
                  <span className="font-semibold">{deal.linerName}</span>
                </>
              ) : null}
            </span>
          </span>
          <span
            className="type-overlay-badge shrink-0 rounded-full bg-[#EF4444] px-2 py-0.5 text-white max-sm:text-[0.6875rem] max-sm:leading-tight sm:px-2.5 sm:py-1"
          >
            -{deal.discountPercent}%
          </span>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-4 pt-3 sm:px-5 sm:pb-6 sm:pt-5">
        <div className="flex min-w-0 flex-1 flex-col">
          {(deal.company || deal.linerName) && (
            <p className="type-card-meta mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-subtitle">
              {deal.company ? (
                <span className="font-semibold text-[color:var(--color-brand)]">
                  {deal.company}
                </span>
              ) : null}
              {deal.company && deal.linerName ? (
                <span aria-hidden>·</span>
              ) : null}
              {deal.linerName ? <span>{deal.linerName}</span> : null}
            </p>
          )}
          <h3 className="type-card-title line-clamp-2 min-h-[2.5em] text-[color:var(--color-black)] sm:min-h-[2.65em]">
            {deal.title}
          </h3>
          <p className="type-card-body mt-2 line-clamp-2 text-subtitle">
            {deal.route}
          </p>

          <div className="type-card-meta mt-3 flex flex-col gap-1 text-subtitle sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="min-w-0 truncate">{deal.dateRange}</span>
            <span className="shrink-0 whitespace-nowrap">
              {nightsLabel(deal.nights)}
            </span>
          </div>

          <div className="divider mt-3 pt-3 sm:mt-4">
            <div className="flex items-end justify-between gap-2 sm:gap-3">
              <span className="type-card-price-label max-w-[7rem] text-subtitle sm:max-w-[120px]">
                Ціна від / за каюту
              </span>
              <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="type-card-meta text-subtitle line-through">
                  {formatDisplayPrice(originalPrice, currency)}
                </span>
                <span className="type-card-price text-[color:var(--color-brand)]">
                  {formatDisplayPrice(price, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Link
          href={deal.href}
          className="btn-primary btn-primary--block btn-card-detail mt-4 shrink-0 sm:mt-6"
        >
          Детальніше
        </Link>
      </div>
    </article>
  );
}
