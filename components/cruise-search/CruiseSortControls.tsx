"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { CruiseSort } from "@/lib/cruise-search/types";

type SortField = "date" | "price" | "duration";

const FIELDS: Array<{ field: SortField; label: string }> = [
  { field: "date", label: "Дата" },
  { field: "price", label: "Ціна" },
  { field: "duration", label: "Тривалість" },
];

type Props = {
  value: CruiseSort;
  onChange: (sort: CruiseSort) => void;
};

function sortId(field: SortField, dir: "asc" | "desc"): CruiseSort {
  return `${field}_${dir}` as CruiseSort;
}

export default function CruiseSortControls({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <span className="text-caption font-semibold text-[color:var(--color-black)]">
        Сортувати
      </span>
      <div className="flex flex-wrap gap-2">
        {FIELDS.map(({ field, label }) => {
          const asc = sortId(field, "asc");
          const desc = sortId(field, "desc");
          const ascActive = value === asc;
          const descActive = value === desc;
          return (
            <div
              key={field}
              className="inline-flex items-center gap-1 rounded-card border border-[color:var(--color-line)] bg-white p-1"
            >
              <span className="text-caption px-2 font-medium text-[color:var(--color-black)]">
                {label}
              </span>
              <button
                type="button"
                aria-label={`${label}: зростання`}
                aria-pressed={ascActive}
                onClick={() => onChange(asc)}
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors ${
                  ascActive
                    ? "bg-[color:var(--color-brand)] text-white"
                    : "text-[color:var(--color-silver)] hover:bg-[color:var(--color-surface-muted)]"
                }`}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                aria-label={`${label}: спадання`}
                aria-pressed={descActive}
                onClick={() => onChange(desc)}
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors ${
                  descActive
                    ? "bg-[color:var(--color-brand)] text-white"
                    : "text-[color:var(--color-silver)] hover:bg-[color:var(--color-surface-muted)]"
                }`}
              >
                <ArrowDown className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
