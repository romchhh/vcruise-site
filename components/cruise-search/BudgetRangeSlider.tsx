"use client";

import { useMemo } from "react";
import { formatMoney } from "@/lib/cruise-search/utils";

type BudgetRangeSliderProps = {
  minBound: number;
  maxBound: number;
  valueMin: number;
  valueMax: number;
  currencyLabel: string;
  onChange: (next: { priceMin: number; priceMax: number }) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stepForRange(span: number) {
  if (span >= 500_000) return 5_000;
  if (span >= 100_000) return 1_000;
  if (span >= 20_000) return 500;
  return 100;
}

export default function BudgetRangeSlider({
  minBound,
  maxBound,
  valueMin,
  valueMax,
  currencyLabel,
  onChange,
}: BudgetRangeSliderProps) {
  const safeMinBound = Math.min(minBound, maxBound);
  const safeMaxBound = Math.max(minBound, maxBound, safeMinBound + 1);
  const span = safeMaxBound - safeMinBound;
  const step = stepForRange(span);

  const min = clamp(valueMin, safeMinBound, safeMaxBound);
  const max = clamp(valueMax, safeMinBound, safeMaxBound);
  const low = Math.min(min, max);
  const high = Math.max(min, max);

  const leftPct = ((low - safeMinBound) / span) * 100;
  const rightPct = ((high - safeMinBound) / span) * 100;

  const label = useMemo(
    () =>
      `${formatMoney(low)} – ${formatMoney(high)} ${currencyLabel}`,
    [currencyLabel, high, low],
  );

  return (
    <div className="col-span-full">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-caption font-semibold text-[color:var(--color-black)]">
          Бюджет
        </span>
        <span className="text-caption font-semibold text-[color:var(--color-brand)]">
          {label}
        </span>
      </div>

      <div className="relative mt-4 h-8">
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[color:var(--color-line)]" />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[color:var(--color-brand)]"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          aria-label="Бюджет від"
          min={safeMinBound}
          max={safeMaxBound}
          step={step}
          value={low}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange({
              priceMin: Math.min(next, high),
              priceMax: high,
            });
          }}
          className="budget-range-input budget-range-input--min"
        />
        <input
          type="range"
          aria-label="Бюджет до"
          min={safeMinBound}
          max={safeMaxBound}
          step={step}
          value={high}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange({
              priceMin: low,
              priceMax: Math.max(next, low),
            });
          }}
          className="budget-range-input budget-range-input--max"
        />
      </div>

      <div className="mt-1 flex justify-between text-caption text-subtitle">
        <span>
          {formatMoney(safeMinBound)} {currencyLabel}
        </span>
        <span>
          {formatMoney(safeMaxBound)} {currencyLabel}
        </span>
      </div>
    </div>
  );
}
