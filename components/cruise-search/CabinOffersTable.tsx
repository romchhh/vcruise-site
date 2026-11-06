"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  offerAreaLabel,
  offerCabinSubtitle,
} from "@/lib/cruise-search/offer-display";
import {
  normalizeTariffName,
  offerKeyOf,
} from "@/lib/cruise-search/offer-key";
import { isValidPromoid } from "@/lib/cruise-search/promoid";
import { formatMoney } from "@/lib/cruise-search/utils";
import type { CruiseCabinOffer, CurrencyCode } from "@/lib/cruise-search/types";
import { CURRENCY_SYMBOL } from "@/lib/cruise-search/constants";
import CabinDeckPicker from "./CabinDeckPicker";
import CabinInfoDialog from "./CabinInfoDialog";
import CruiseInlineLoader from "./CruiseInlineLoader";
import CruisePagePreloader from "./CruisePagePreloader";

type Props = {
  offers: CruiseCabinOffer[];
  currency: CurrencyCode;
  selectedKey: string;
  onSelect: (offer: CruiseCabinOffer) => void;
  bookingUrl: string;
  adults: number;
  children: number;
  teens: number;
  onCabinConfirm: (cabinNumber: string) => void;
  loading?: boolean;
  /** Prices are visible; promo ids / cabin numbers are still refreshing. */
  refreshing?: boolean;
  emptyMessage?: string | null;
};

function offerArea(offer: CruiseCabinOffer) {
  return offerAreaLabel(offer) || "—";
}

export default function CabinOffersTable({
  offers,
  currency,
  selectedKey,
  onSelect,
  bookingUrl,
  adults,
  children,
  teens,
  onCabinConfirm,
  loading = false,
  refreshing = false,
  emptyMessage = null,
}: Props) {
  const symbol = CURRENCY_SYMBOL[currency];
  const [tariffs, setTariffs] = useState<string[]>([]);
  const [infoOffer, setInfoOffer] = useState<CruiseCabinOffer | null>(null);

  const tariffNames = useMemo(() => {
    const names = new Set<string>();
    for (const offer of offers) {
      const name = normalizeTariffName(offer.tariffName);
      if (name) names.add(name);
    }
    return [...names];
  }, [offers]);

  const visibleOffers = useMemo(() => {
    if (!tariffs.length) return offers;
    return offers.filter((offer) =>
      tariffs.includes(normalizeTariffName(offer.tariffName)),
    );
  }, [offers, tariffs]);

  const toggleTariff = (name: string) => {
    setTariffs((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  if (loading && offers.length === 0) {
    return (
      <div className="rounded-card border border-[color:var(--color-line)] bg-white">
        <CruisePagePreloader
          label="Тарифи з оператора, це займає кілька секунд…"
          showTips={false}
          className="border-0 bg-transparent py-8"
        />
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

  const selectedOffer =
    visibleOffers.find((offer) => offerKeyOf(offer) === selectedKey) ?? null;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-card border border-[color:var(--color-line)] bg-white">
      {refreshing ? (
        <CruiseInlineLoader
          label="Уточнюємо наявність і номери кают…"
          className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] py-2.5"
        />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[color:var(--color-line)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-h4 font-bold text-[color:var(--color-black)]">
            Каюти та тарифи
          </h2>
          <p className="text-caption mt-1 text-subtitle">
            Оберіть тариф, потім номер каюти на плані палуби
          </p>
        </div>
      </div>

      {tariffNames.length > 1 ? (
        <div className="border-b border-[color:var(--color-line)] px-4 py-3 sm:px-5">
          <p className="text-caption font-semibold text-[color:var(--color-black)]">
            Обрати тариф
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tariffNames.map((name) => {
              const active = tariffs.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTariff(name)}
                  className={`rounded-full border px-3 py-1.5 text-caption font-semibold ${
                    active
                      ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white"
                      : "border-[color:var(--color-line)] bg-white text-[color:var(--color-black)]"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ul className="divide-y divide-[color:var(--color-line)] md:hidden">
        {visibleOffers.map((offer) => {
          const key = offerKeyOf(offer);
          const selected = selectedKey === key;
          const price = offer.price?.[currency];
          return (
            <li key={key}>
              <div
                className={`px-4 py-3.5 ${
                  selected ? "bg-[color:var(--color-brand-light)]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-bold text-[color:var(--color-black)]">
                      {offer.cabinCode}
                      <span className="font-semibold text-[color:var(--color-brand)]">
                        {" · "}
                        {normalizeTariffName(offer.tariffName)}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (offer.shipId) setInfoOffer(offer);
                      }}
                      className={`text-caption mt-1 text-left text-subtitle ${
                        offer.shipId
                          ? "underline decoration-dotted underline-offset-2"
                          : ""
                      }`}
                    >
                      {offerCabinSubtitle(offer)}
                    </button>
                    <p className="text-caption mt-0.5 text-[color:var(--color-silver)]">
                      {offerArea(offer)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-body font-bold tabular-nums text-[color:var(--color-brand)]">
                      {price != null ? `${formatMoney(price)} ${symbol}` : "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelect(offer)}
                      aria-pressed={selected}
                      className={`inline-flex min-h-[2.5rem] items-center gap-0.5 rounded-full px-3.5 py-2 text-caption font-semibold text-white ${
                        selected
                          ? "bg-[color:var(--color-brand-hover)]"
                          : "bg-[color:var(--color-brand)]"
                      }`}
                    >
                      {selected ? "Обрано" : "Вибрати"}
                      {selected ? null : (
                        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] text-caption text-[color:var(--color-silver)]">
              <th className="px-5 py-2.5 font-semibold">Код</th>
              <th className="px-3 py-2.5 font-semibold">Каюта</th>
              <th className="px-3 py-2.5 font-semibold">Тариф</th>
              <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Площа</th>
              <th className="px-3 py-2.5 font-semibold text-right">Ціна</th>
              <th className="px-5 py-2.5 font-semibold text-right">
                <span className="sr-only">Вибір</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleOffers.map((offer) => {
              const key = offerKeyOf(offer);
              const selected = selectedKey === key;
              const price = offer.price?.[currency];
              return (
                <Fragment key={key}>
                  <tr
                    className={`border-b border-[color:var(--color-line)] ${
                      selected
                        ? "bg-[color:var(--color-brand-light)]"
                        : "bg-white"
                    }`}
                  >
                    <td className="px-5 py-3 align-middle">
                      <span className="text-caption font-bold text-[color:var(--color-black)]">
                        {offer.cabinCode}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => {
                          if (offer.shipId) setInfoOffer(offer);
                        }}
                        className="text-left"
                      >
                        <p
                          className={`text-caption font-semibold text-[color:var(--color-black)] ${
                            offer.shipId
                              ? "underline decoration-dotted underline-offset-2"
                              : ""
                          }`}
                        >
                          {offer.cabinCategory ?? "—"}
                        </p>
                        <p className="text-caption mt-0.5 text-subtitle">
                          {offerCabinSubtitle(offer)}
                        </p>
                      </button>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="text-caption font-semibold text-[color:var(--color-brand)]">
                        {normalizeTariffName(offer.tariffName)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle whitespace-nowrap text-caption text-subtitle">
                      {offerArea(offer)}
                    </td>
                    <td className="px-3 py-3 align-middle text-right">
                      <span className="text-body font-bold text-[color:var(--color-brand)]">
                        {price != null ? `${formatMoney(price)} ${symbol}` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => onSelect(offer)}
                        className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-full px-3 py-1.5 text-caption font-semibold ${
                          selected
                            ? "bg-[color:var(--color-brand)] text-white"
                            : "border border-[color:var(--color-line)] bg-white text-[color:var(--color-black)]"
                        }`}
                      >
                        {selected ? "Обрано" : "Вибрати"}
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedOffer && isValidPromoid(selectedOffer.promoid) ? (
        <div className="border-t border-[color:var(--color-line)]">
          <CabinDeckPicker
            bookingUrl={bookingUrl}
            offer={selectedOffer}
            adults={adults}
            children={children}
            teens={teens}
            onConfirm={onCabinConfirm}
          />
        </div>
      ) : selectedOffer && (loading || refreshing) ? (
        <CruiseInlineLoader
          label="Завантажуємо номери кают і тарифи з оператора…"
          variant="block"
          className="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] min-h-40"
        />
      ) : selectedOffer ? (
        <div className="border-t border-[color:var(--color-line)] px-4 py-4 sm:px-5">
          <p className="text-caption text-[color:var(--color-black)]">
            {selectedOffer.availabilityOffline
              ? "Для цього тарифу номер каюти та наявність уточнює менеджер після заявки."
              : "Онлайн-вибір номера для цього тарифу недоступний — менеджер підбере каюту після заявки."}
          </p>
          <button
            type="button"
            onClick={() => onCabinConfirm("MANAGER")}
            className="btn-primary mt-4"
          >
            Продовжити без номера каюти
          </button>
        </div>
      ) : null}

      <p className="border-t border-[color:var(--color-line)] px-4 py-3 text-caption text-[color:var(--color-silver)] sm:px-5">
        * Вартість вказана за каюту (на вибрану кількість гостей), включаючи
        портові збори та чайові
      </p>

      {infoOffer?.shipId ? (
        <CabinInfoDialog
          shipId={infoOffer.shipId}
          cabinCode={infoOffer.cabinCode}
          fallbackTitle={infoOffer.cabinName}
          onClose={() => setInfoOffer(null)}
        />
      ) : null}
    </div>
  );
}
