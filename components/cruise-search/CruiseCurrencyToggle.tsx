"use client";

import { CURRENCY_OPTIONS } from "@/lib/cruise-search/constants";
import type { CurrencyCode } from "@/lib/cruise-search/types";

type Props = {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  compact?: boolean;
  /** Chips (search) or native select under a price (detail). */
  variant?: "chips" | "select";
  className?: string;
};

export default function CruiseCurrencyToggle({
  value,
  onChange,
  compact = false,
  variant = "chips",
  className = "",
}: Props) {
  if (variant === "select") {
    return (
      <label
        className={`inline-flex shrink-0 items-center gap-2 ${className}`}
      >
        {!compact ? (
          <span className="text-caption font-semibold text-[color:var(--color-black)]">
            Валюта
          </span>
        ) : (
          <span className="sr-only">Валюта</span>
        )}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as CurrencyCode)}
          className="field-control h-9 w-auto min-w-[6.75rem] cursor-pointer bg-white px-2.5 text-caption font-semibold text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
          aria-label="Валюта"
        >
          {CURRENCY_OPTIONS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.chip}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
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
