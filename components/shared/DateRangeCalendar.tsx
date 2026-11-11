"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MONTH_LABELS } from "@/lib/cruise-search/constants";
import {
  formatFullDate,
  getMonthDayCells,
  parseFullDate,
  parseIso,
  WEEKDAY_LABELS_SUN,
} from "@/lib/cruise-finder/calendar";

export function formatDateRangeLabel(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return "";
  if (dateFrom && dateTo) {
    return `${formatFullDate(dateFrom)}-${formatFullDate(dateTo)}`;
  }
  if (dateFrom) return `${formatFullDate(dateFrom)}-…`;
  return "";
}

function monthTitle(year: number, month: number) {
  return `${MONTH_LABELS[month] ?? ""} ${year}`;
}

function viewFromIso(iso: string, fallback: Date) {
  if (!iso) return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  const { year, month } = parseIso(iso);
  return new Date(year, month, 1);
}

function MonthPane({
  year,
  month,
  dateFrom,
  dateTo,
  minDate,
  onPick,
}: {
  year: number;
  month: number;
  dateFrom: string;
  dateTo: string;
  minDate: string;
  onPick: (iso: string) => void;
}) {
  const cells = useMemo(() => getMonthDayCells(year, month), [year, month]);

  return (
    <div className="min-w-0 flex-1">
      <p className="text-body mb-3 truncate text-center font-semibold text-[color:var(--color-black)]">
        {monthTitle(year, month)}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-small font-semibold text-[color:var(--color-black)]">
        {WEEKDAY_LABELS_SUN.map((label) => (
          <span key={label} className="min-w-0 truncate py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const disabled = cell.iso < minDate;
          const isStart = dateFrom && cell.iso === dateFrom;
          const isEnd = dateTo && cell.iso === dateTo;
          const inRange =
            dateFrom &&
            dateTo &&
            cell.iso > dateFrom &&
            cell.iso < dateTo;
          const endpoint = isStart || isEnd;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onPick(cell.iso)}
              className={`flex h-9 w-full min-w-0 items-center justify-center text-small font-medium tabular-nums transition-colors ${
                disabled
                  ? "cursor-not-allowed text-[color:var(--color-silver)] opacity-40"
                  : endpoint
                    ? "rounded-md bg-[color:var(--color-brand)] text-white"
                    : inRange
                      ? "rounded-md bg-[color:var(--color-brand-light)] text-[color:var(--color-black)]"
                      : cell.outside
                        ? "text-[color:var(--color-silver)] hover:bg-[color:var(--color-surface-muted)]"
                        : "text-[color:var(--color-black)] hover:bg-[color:var(--color-surface-muted)]"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type DateRangeCalendarProps = {
  dateFrom: string;
  dateTo: string;
  minDate: string;
  onChange: (patch: { dateFrom: string; dateTo: string }) => void;
  showTextInputs?: boolean;
  className?: string;
};

export default function DateRangeCalendar({
  dateFrom,
  dateTo,
  minDate,
  onChange,
  showTextInputs = true,
  className = "",
}: DateRangeCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() =>
    viewFromIso(dateFrom, new Date()),
  );
  const [fromText, setFromText] = useState(() =>
    dateFrom ? formatFullDate(dateFrom) : "",
  );
  const [toText, setToText] = useState(() =>
    dateTo ? formatFullDate(dateTo) : "",
  );

  useEffect(() => {
    setFromText(dateFrom ? formatFullDate(dateFrom) : "");
    setToText(dateTo ? formatFullDate(dateTo) : "");
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (dateFrom) {
      setViewMonth(viewFromIso(dateFrom, new Date()));
    }
  }, [dateFrom]);

  const rightMonth = useMemo(
    () => new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    [viewMonth],
  );

  const pickDay = (iso: string) => {
    if (iso < minDate) return;
    if (!dateFrom || (dateFrom && dateTo)) {
      onChange({ dateFrom: iso, dateTo: "" });
      return;
    }
    if (iso < dateFrom) {
      onChange({ dateFrom: iso, dateTo: dateFrom });
      return;
    }
    onChange({ dateFrom, dateTo: iso });
  };

  const commitFromText = () => {
    const iso = parseFullDate(fromText);
    if (!iso || iso < minDate) {
      setFromText(dateFrom ? formatFullDate(dateFrom) : "");
      return;
    }
    onChange({
      dateFrom: iso,
      dateTo: dateTo && dateTo >= iso ? dateTo : "",
    });
  };

  const commitToText = () => {
    const iso = parseFullDate(toText);
    if (!iso || iso < minDate) {
      setToText(dateTo ? formatFullDate(dateTo) : "");
      return;
    }
    if (dateFrom && iso < dateFrom) {
      onChange({ dateFrom: iso, dateTo: dateFrom });
      return;
    }
    onChange({ dateFrom: dateFrom || iso, dateTo: iso });
  };

  const shiftMonths = (delta: number) => {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  return (
    <div className={className}>
      {showTextInputs ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-subtitle">Дата від</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="дд.мм.рррр"
              value={fromText}
              onChange={(event) => setFromText(event.target.value)}
              onBlur={commitFromText}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitFromText();
              }}
              className="field-control h-11 bg-white px-3 text-body text-[color:var(--color-black)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-subtitle">Дата до</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="дд.мм.рррр"
              value={toText}
              onChange={(event) => setToText(event.target.value)}
              onBlur={commitToText}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitToText();
              }}
              className="field-control h-11 bg-white px-3 text-body text-[color:var(--color-black)]"
            />
          </label>
        </div>
      ) : null}

      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Попередні місяці"
          onClick={() => shiftMonths(-1)}
          className="btn-control mt-8 shrink-0"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-4">
          <MonthPane
            year={viewMonth.getFullYear()}
            month={viewMonth.getMonth()}
            dateFrom={dateFrom}
            dateTo={dateTo}
            minDate={minDate}
            onPick={pickDay}
          />
          <MonthPane
            year={rightMonth.getFullYear()}
            month={rightMonth.getMonth()}
            dateFrom={dateFrom}
            dateTo={dateTo}
            minDate={minDate}
            onPick={pickDay}
          />
        </div>

        <button
          type="button"
          aria-label="Наступні місяці"
          onClick={() => shiftMonths(1)}
          className="btn-control mt-8 shrink-0"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
