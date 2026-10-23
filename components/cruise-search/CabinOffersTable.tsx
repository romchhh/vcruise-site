"use client";

import {
  offerCabinSubtitle,
  offerMetaLine,
} from "@/lib/cruise-search/offer-display";
import {
  normalizeTariffName,
  offerKeyOf,
} from "@/lib/cruise-search/offer-key";
import { formatMoney } from "@/lib/cruise-search/utils";
import type { CruiseCabinOffer, CurrencyCode } from "@/lib/cruise-search/types";
import { CURRENCY_SYMBOL } from "@/lib/cruise-search/constants";

type Props = {
  offers: CruiseCabinOffer[];
  currency: CurrencyCode;
  selectedKey: string;
  scalePrice: (amount: number | null | undefined) => number | null;
  onSelect: (offer: CruiseCabinOffer) => void;
  loading?: boolean;
  emptyMessage?: string | null;
};

export default function CabinOffersTable({
  offers,
  currency,
  selectedKey,
  scalePrice,
  onSelect,
  loading = false,
  emptyMessage = null,
}: Props) {
  const symbol = CURRENCY_SYMBOL[currency];

  if (loading && offers.length === 0) {
    return (
      <div
        className="flex items-center justify-center gap-3 rounded-card border border-[color:var(--color-line)] bg-white py-10"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-9 w-9 shrink-0 animate-spin rounded-full border-[3px] border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
          aria-hidden
        />
        <span className="text-caption text-subtitle">
          Підбираємо каюти та тарифи…
        </span>
      </div>
    );
  }

  if (emptyMessage) {
    return (
      <p className="rounded-card bg-amber-50 px-4 py-3 text-caption text-amber-800">
        {emptyMessage}
      </p>
    );
  }

  if (!offers.length) return null;

  return (
    <div className="overflow-hidden rounded-card border border-[color:var(--color-line)] bg-white">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color:var(--color-line)] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-h4 font-bold text-[color:var(--color-black)]">
            Каюти та тарифи
          </h2>
          <p className="text-caption mt-1 text-subtitle">
            Оберіть рядок — ціна за всю каюту на вибрану кількість гостей
          </p>
        </div>
        <p className="text-caption text-[color:var(--color-silver)]">
          {offers.length}{" "}
          {offers.length === 1
            ? "варіант"
            : offers.length < 5
              ? "варіанти"
              : "варіантів"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] text-caption text-[color:var(--color-silver)]">
              <th className="px-4 py-2.5 font-semibold sm:px-5">Код</th>
              <th className="px-3 py-2.5 font-semibold">Каюта</th>
              <th className="px-3 py-2.5 font-semibold">Тариф</th>
              <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                Площа
              </th>
              <th className="px-3 py-2.5 font-semibold text-right">Ціна</th>
              <th className="px-4 py-2.5 font-semibold text-right sm:px-5">
                <span className="sr-only">Вибір</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const key = offerKeyOf(offer);
              const selected = selectedKey === key;
              const base = offer.price?.[currency] ?? null;
              const scaled = scalePrice(base);
              const area =
                offer.areaM2 != null && Number.isFinite(offer.areaM2)
                  ? `${offer.areaM2} м²`
                  : offerMetaLine(offer).match(/[\d.+-\s]+м²/)?.[0] ?? "—";

              return (
                <tr
                  key={key}
                  onClick={() => onSelect(offer)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(offer);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  className={`cursor-pointer border-b border-[color:var(--color-line)] last:border-b-0 transition-colors ${
                    selected
                      ? "bg-[color:var(--color-brand-light)]"
                      : "bg-white hover:bg-[color:var(--color-surface-subtle)]"
                  }`}
                >
                  <td className="px-4 py-3 align-middle sm:px-5">
                    <span className="text-caption font-bold text-[color:var(--color-black)]">
                      {offer.cabinCode}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <p className="text-caption font-semibold text-[color:var(--color-black)]">
                      {offer.cabinCategory ?? "—"}
                    </p>
                    <p className="text-caption mt-0.5 text-subtitle">
                      {offerCabinSubtitle(offer)}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-caption font-semibold text-[color:var(--color-brand)]">
                      {normalizeTariffName(offer.tariffName)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle whitespace-nowrap text-caption text-subtitle">
                    {area}
                  </td>
                  <td className="px-3 py-3 align-middle text-right">
                    <span className="text-body font-bold text-[color:var(--color-brand)]">
                      {scaled != null
                        ? `${formatMoney(scaled)} ${symbol}`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-right sm:px-5">
                    <span
                      className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-full px-3 py-1.5 text-caption font-semibold ${
                        selected
                          ? "bg-[color:var(--color-brand)] text-white"
                          : "border border-[color:var(--color-line)] bg-white text-[color:var(--color-black)]"
                      }`}
                    >
                      {selected ? "Обрано" : "Вибрати"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-[color:var(--color-line)] px-4 py-3 text-caption text-[color:var(--color-silver)] sm:px-5">
        * Вартість вказана за каюту (на вибрану кількість гостей), включаючи
        портові збори та чайові
      </p>
    </div>
  );
}
