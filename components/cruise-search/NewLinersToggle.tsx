"use client";

import { NEW_LINER_MIN_BUILT_YEAR } from "@/lib/cruise-search/constants";

export default function NewLinersToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex w-full items-center gap-4 rounded-card border px-4 py-3.5 text-left transition-colors sm:px-5 ${
        checked
          ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)]/5"
          : "border-[color:var(--color-border-input)] bg-white hover:bg-[color:var(--color-surface-subtle)]"
      }`}
    >
      <span
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
          checked
            ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)]"
            : "border-[color:var(--color-line)] bg-white"
        }`}
      >
        {checked ? (
          <svg width="12" height="10" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-body block font-semibold text-[color:var(--color-black)]">
          Лише нові лайнери
        </span>
        <span className="text-caption mt-0.5 block text-subtitle">
          Спущені на воду з {NEW_LINER_MIN_BUILT_YEAR} року. Натисніть, щоб{" "}
          {checked ? "показати всі" : "увімкнути фільтр"}.
        </span>
      </span>
    </button>
  );
}
