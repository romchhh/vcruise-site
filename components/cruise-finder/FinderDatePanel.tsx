"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_LABELS } from "@/lib/cruise-search/constants";
import { isMonthSelectable } from "@/lib/cruise-search/month-helpers";
import {
  formatIso,
  formatShortDate,
  getMonthGrid,
  MONTH_NAMES_FULL,
  WEEKDAY_LABELS,
} from "@/lib/cruise-finder/calendar";

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
  calendarYear: number;
  calendarMonth: number;
  dateFrom: string;
  dateTo: string;
};

type FinderDatePanelProps = {
  state: FinderDateState;
  onChange: (patch: Partial<FinderDateState>) => void;
};

export default function FinderDatePanel({ state, onChange }: FinderDatePanelProps) {
  const {
    selectedYear,
    selectedMonths,
    calendarYear,
    calendarMonth,
    dateFrom,
    dateTo,
  } = state;

  const grid = getMonthGrid(calendarYear, calendarMonth);

  const toggleMonth = (month: string) => {
    if (!isMonthSelectable(month, selectedYear)) return;

    const next = selectedMonths.includes(month)
      ? selectedMonths.filter((item) => item !== month)
      : [...selectedMonths, month];

    const monthIndex = MONTH_LABELS.indexOf(month as (typeof MONTH_LABELS)[number]);
    onChange({
      selectedMonths: next,
      calendarMonth: monthIndex >= 0 ? monthIndex : calendarMonth,
      calendarYear:
        selectedYear !== "Будь-коли" ? Number(selectedYear) : calendarYear,
    });
  };

  const handleDayClick = (day: number) => {
    const iso = formatIso(calendarYear, calendarMonth, day);
    if (!dateFrom || (dateFrom && dateTo)) {
      onChange({ dateFrom: iso, dateTo: "" });
      return;
    }
    if (iso < dateFrom) {
      onChange({ dateFrom: iso, dateTo: dateFrom });
      return;
    }
    onChange({ dateTo: iso });
  };

  const isDaySelected = (day: number) => {
    const iso = formatIso(calendarYear, calendarMonth, day);
    if (dateFrom && iso === dateFrom) return true;
    if (dateTo && iso === dateTo) return true;
    if (dateFrom && dateTo && iso > dateFrom && iso < dateTo) return true;
    return false;
  };

  const shiftCalendar = (delta: number) => {
    const date = new Date(calendarYear, calendarMonth + delta, 1);
    onChange({
      calendarYear: date.getFullYear(),
      calendarMonth: date.getMonth(),
    });
  };

  return (
    <div className="finder-date-panel mt-3 grid gap-6 rounded-panel border border-[color:var(--color-line)] bg-white p-4 sm:p-5 md:grid-cols-2">
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
                  isMonthSelectable(month, year)
                ),
                calendarYear:
                  year !== "Будь-коли" ? Number(year) : calendarYear,
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

      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-body font-semibold text-[color:var(--color-black)]">
            {MONTH_NAMES_FULL[calendarMonth]} {calendarYear}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Попередній місяць"
              onClick={() => shiftCalendar(-1)}
              className="btn-control"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Наступний місяць"
              onClick={() => shiftCalendar(1)}
              className="btn-control"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-small text-subtitle">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="py-1 font-medium">
              {label}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day, index) =>
            day === null ? (
              <span key={`empty-${index}`} />
            ) : (
              <button
                key={`${calendarYear}-${calendarMonth}-${day}`}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`text-caption flex h-9 w-full items-center justify-center rounded-full font-medium transition-colors ${
                  isDaySelected(day)
                    ? "bg-[color:var(--color-brand)] text-white"
                    : "text-[color:var(--color-black)] hover:bg-[color:var(--color-surface-muted)]"
                }`}
              >
                {day}
              </button>
            )
          )}
        </div>

        {dateFrom ? (
          <p className="text-caption mt-4 text-subtitle">
            {dateTo
              ? `${formatShortDate(dateFrom)} – ${formatShortDate(dateTo)}`
              : `${formatShortDate(dateFrom)} – …`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
