"use client";

import {
  HERO_DURATION_OPTIONS,
  MONTH_LABELS,
  REGION_TREE,
} from "@/lib/cruise-search/constants";
import type {
  CruiseSearchFilters,
  CruiseSort,
  CurrencyCode,
} from "@/lib/cruise-search/types";
import { isMonthSelectable } from "@/lib/cruise-search/month-helpers";
import { todayIso } from "@/lib/cruise-search/utils";
import NewLinersToggle from "./NewLinersToggle";

type Props = {
  filters: CruiseSearchFilters;
  companies: string[];
  liners: Array<{ slug: string; name: string }>;
  onChange: (patch: Partial<CruiseSearchFilters>) => void;
  onApply: () => void;
  onReset: () => void;
};

const sortOptions: Array<{ value: CruiseSort; label: string }> = [
  { value: "date_asc", label: "Дата: найближча" },
  { value: "date_desc", label: "Дата: найпізніша" },
  { value: "price_asc", label: "Ціна: зростання" },
  { value: "price_desc", label: "Ціна: спадання" },
  { value: "duration_asc", label: "Тривалість: коротші" },
  { value: "duration_desc", label: "Тривалість: довші" },
];

const years = ["Будь-коли", "2026", "2027", "2028"];
const currencies: CurrencyCode[] = ["NAT", "USD", "EUR"];

export default function CruiseSearchFilters({
  filters,
  companies,
  liners,
  onChange,
  onApply,
  onReset,
}: Props) {
  const selectedRegion = filters.regions[0] ?? "";

  const minDate = todayIso();

  const toggleMonth = (month: string) => {
    if (!isMonthSelectable(month, filters.year)) return;

    const months = filters.months.includes(month)
      ? filters.months.filter((item) => item !== month)
      : [...filters.months, month];
    onChange({ months });
  };

  return (
    <div className="space-y-4">
      <NewLinersToggle
        checked={filters.newLinersOnly}
        onChange={(newLinersOnly) => onChange({ newLinersOnly })}
      />

      <div className="rounded-card bg-white p-5 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Регіон
          </span>
          <select
            value={selectedRegion}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ regions: value ? [value] : [] });
            }}
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          >
            <option value="">Усі регіони</option>
            {REGION_TREE.map((group) =>
              group.group ? (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                group.items.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))
              )
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Круїзна компанія
          </span>
          <select
            value={filters.company}
            onChange={(event) =>
              onChange({ company: event.target.value, liner: "" })
            }
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          >
            <option value="">Усі компанії</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Лайнер
          </span>
          <select
            value={filters.liner}
            onChange={(event) => onChange({ liner: event.target.value })}
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          >
            <option value="">Усі лайнери</option>
            {liners.map((liner) => (
              <option key={liner.slug} value={liner.slug}>
                {liner.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Рік
          </span>
          <select
            value={filters.year}
            onChange={(event) => {
              const year = event.target.value;
              onChange({
                year,
                months: filters.months.filter((month) =>
                  isMonthSelectable(month, year)
                ),
              });
            }}
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Тривалість
          </span>
          <select
            value={filters.duration}
            onChange={(event) => onChange({ duration: event.target.value })}
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          >
            {HERO_DURATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Сортування
          </span>
          <select
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as CruiseSort })
            }
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Дата від
          </span>
          <input
            type="date"
            min={minDate}
            value={filters.dateFrom}
            onChange={(event) => onChange({ dateFrom: event.target.value })}
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Дата до
          </span>
          <input
            type="date"
            min={filters.dateFrom || minDate}
            value={filters.dateTo}
            onChange={(event) => onChange({ dateTo: event.target.value })}
            className="field-control h-12 cursor-pointer bg-white px-4 text-body text-[color:var(--color-black)]"
          />
        </label>
      </div>

      <div className="mt-5">
        <span className="text-caption font-semibold text-[color:var(--color-black)]">
          Місяці
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {MONTH_LABELS.map((month) => {
            const selected = filters.months.includes(month);
            const selectable = isMonthSelectable(month, filters.year);
            return (
              <button
                key={month}
                type="button"
                disabled={!selectable}
                onClick={() => toggleMonth(month)}
                className={`chip transition-colors ${
                  !selectable
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer"
                } ${
                  selected
                    ? "chip-brand"
                    : "chip-muted-brand hover:bg-[color:var(--color-surface-hover)]"
                }`}
              >
                {month}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divider mt-6 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {currencies.map((currency) => (
            <button
              key={currency}
              type="button"
              onClick={() => onChange({ currency })}
              className={`chip cursor-pointer transition-colors ${
                filters.currency === currency
                  ? "chip-brand"
                  : "chip-muted-brand hover:bg-[color:var(--color-surface-hover)]"
              }`}
            >
              {currency === "NAT" ? "₴ UAH" : currency}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onReset} className="btn-secondary">
            Скинути
          </button>
          <button type="button" onClick={onApply} className="btn-primary">
            Застосувати
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
