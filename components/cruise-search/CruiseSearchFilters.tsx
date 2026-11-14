"use client";

import {
  CURRENCY_SYMBOL,
  HERO_DESTINATIONS,
  HERO_DURATION_OPTIONS,
  MONTH_LABELS,
  REGION_TREE,
} from "@/lib/cruise-search/constants";
import type { CruiseSearchFilters } from "@/lib/cruise-search/types";
import { effectiveMonthYear, isMonthSelectable } from "@/lib/cruise-search/month-helpers";
import { todayIso } from "@/lib/cruise-search/utils";
import BudgetRangeSlider from "./BudgetRangeSlider";
import CruiseCurrencyToggle from "./CruiseCurrencyToggle";
import CruiseDateRangePicker from "./CruiseDateRangePicker";
import FilterMultiSelect from "./FilterMultiSelect";
import NewLinersToggle from "./NewLinersToggle";

type Props = {
  filters: CruiseSearchFilters;
  companies: string[];
  liners: Array<{ slug: string; name: string }>;
  priceBoundMin: number;
  priceBoundMax: number;
  onChange: (patch: Partial<CruiseSearchFilters>) => void;
  onApply: () => void;
  onReset: () => void;
};

export default function CruiseSearchFilters({
  filters,
  companies,
  liners,
  priceBoundMin,
  priceBoundMax,
  onChange,
  onApply,
  onReset,
}: Props) {
  const selectedRegion = filters.regions[0] ?? "";

  const minDate = todayIso();
  const monthYear = effectiveMonthYear(
    filters.year,
    filters.dateFrom,
    filters.dateTo,
  );

  const toggleMonth = (month: string) => {
    if (!isMonthSelectable(month, monthYear)) return;

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
            <optgroup label="Популярні напрямки">
              {HERO_DESTINATIONS.filter((item) => item !== "Будь-який").map(
                (label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ),
              )}
            </optgroup>
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
              ),
            )}
          </select>
        </label>

        <FilterMultiSelect
          label="Круїзна компанія"
          allLabel="Усі компанії"
          options={companies.map((company) => ({
            value: company,
            label: company,
          }))}
          value={filters.company}
          onChange={(company) => onChange({ company })}
        />

        <FilterMultiSelect
          label="Лайнер"
          allLabel="Усі лайнери"
          options={liners.map((liner) => ({
            value: liner.slug,
            label: liner.name,
          }))}
          value={filters.liner}
          onChange={(liner) => onChange({ liner })}
        />

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

        <CruiseDateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          minDate={minDate}
          onChange={(patch) =>
            onChange({
              ...patch,
              year: "Будь-коли",
            })
          }
        />

        <BudgetRangeSlider
          minBound={priceBoundMin}
          maxBound={priceBoundMax}
          valueMin={filters.priceMin}
          valueMax={filters.priceMax}
          currencyLabel={CURRENCY_SYMBOL[filters.currency]}
          onChange={(next) => onChange(next)}
        />
      </div>

      <div className="mt-5">
        <span className="text-caption font-semibold text-[color:var(--color-black)]">
          Місяці
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {MONTH_LABELS.map((month) => {
            const selected = filters.months.includes(month);
            const selectable = isMonthSelectable(month, monthYear);
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
        <CruiseCurrencyToggle
          value={filters.currency}
          onChange={(currency) => onChange({ currency })}
        />

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
