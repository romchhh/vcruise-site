"use client";

import { CURRENCY_OPTIONS } from "@/lib/cruise-search/constants";
import type { CurrencyCode } from "@/lib/cruise-search/types";

type Props = {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  compact?: boolean;
};

export default function CruiseCurrencyToggle({
  value,
  onChange,
  compact = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact ? (
        <span className="text-caption font-semibold text-[color:var(--color-black)]">
          Валюта
        </span>
      ) : null}
      {CURRENCY_OPTIONS.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => onChange(item.code)}
          title={item.label}
          className={`chip cursor-pointer transition-colors ${
            value === item.code
              ? "chip-brand"
              : "chip-muted-brand hover:bg-[color:var(--color-surface-hover)]"
          }`}
        >
          {item.chip}
        </button>
      ))}
    </div>
  );
}
