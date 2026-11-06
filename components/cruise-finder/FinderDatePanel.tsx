"use client";

import DateRangeCalendar from "@/components/shared/DateRangeCalendar";
import { MONTH_LABELS } from "@/lib/cruise-search/constants";
import { isMonthSelectable } from "@/lib/cruise-search/month-helpers";
import { todayIso } from "@/lib/cruise-search/utils";

const YEARS = ["Будь-коли", "2026", "2027", "2028"] as const;

function FinderCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center gap-3 rounded-control px-1 py-2 text-left transition-colors hover:bg-[color:var(--color-surface-subtle)]"
    >
      <span
        className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border ${
          checked
            ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)]"
            : "border-[color:var(--color-line)] bg-white"
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-caption font-medium text-[color:var(--color-black)]">
        {label}
      </span>
    </button>
  );
}

export type FinderDateState = {
  selectedYear: string;
  selectedMonths: string[];
  dateFrom: string;
  dateTo: string;
};

type FinderDatePanelProps = {
  state: FinderDateState;
  onChange: (patch: Partial<FinderDateState>) => void;
};

export default function FinderDatePanel({ state, onChange }: FinderDatePanelProps) {
  const { selectedYear, selectedMonths, dateFrom, dateTo } = state;
  const minDate = todayIso();

  const toggleMonth = (month: string) => {
    if (!isMonthSelectable(month, selectedYear)) return;

    const next = selectedMonths.includes(month)
      ? selectedMonths.filter((item) => item !== month)
      : [...selectedMonths, month];

    onChange({ selectedMonths: next });
  };

  const handleRangeChange = (patch: { dateFrom: string; dateTo: string }) => {
    onChange({
      ...patch,
      selectedYear: "Будь-коли",
      selectedMonths: [],
    });
  };

  return (
    <div className="finder-date-panel mt-3 rounded-panel border border-[color:var(--color-line)] bg-white p-4 sm:p-5">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {YEARS.map((year) => (
            <FinderCheckbox
              key={year}
              label={year}
              checked={selectedYear === year}
              onChange={() => {
                onChange({
                  selectedYear: year,
                  selectedMonths: selectedMonths.filter((month) =>
                    isMonthSelectable(month, year),
                  ),
                });
              }}
            />
          ))}

          <div className="mt-4 grid grid-cols-4 gap-2">
            {MONTH_LABELS.map((month) => {
              const selected = selectedMonths.includes(month);
              const selectable = isMonthSelectable(month, selectedYear);
              return (
                <button
                  key={month}
                  type="button"
                  disabled={!selectable}
                  onClick={() => toggleMonth(month)}
                  className={`text-small normal-case rounded-full border px-1.5 py-2 font-medium transition-colors ${
                    !selectable
                      ? "cursor-not-allowed border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] text-subtitle opacity-60"
                      : selected
                        ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white"
                        : "border-[color:var(--color-line)] bg-white text-[color:var(--color-black)] hover:border-[color:var(--color-brand)]/40"
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:border-l md:border-[color:var(--color-line)] md:pl-6">
          <p className="text-caption font-semibold text-[color:var(--color-black)]">
            Точні дати відправлення
          </p>
          <DateRangeCalendar
            dateFrom={dateFrom}
            dateTo={dateTo}
            minDate={minDate}
            onChange={handleRangeChange}
          />
        </div>
      </div>
    </div>
  );
}
