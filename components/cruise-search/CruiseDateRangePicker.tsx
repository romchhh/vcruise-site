"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import DateRangeCalendar, {
  formatDateRangeLabel,
} from "@/components/shared/DateRangeCalendar";

type Props = {
  dateFrom: string;
  dateTo: string;
  minDate: string;
  onChange: (patch: { dateFrom: string; dateTo: string }) => void;
  label?: string;
  placeholder?: string;
  className?: string;
};

export default function CruiseDateRangePicker({
  dateFrom,
  dateTo,
  minDate,
  onChange,
  label = "Дати відправлення",
  placeholder = "Оберіть діапазон дат",
  className = "relative flex flex-col gap-2 md:col-span-2 xl:col-span-2",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const display = formatDateRangeLabel(dateFrom, dateTo);

  return (
    <div ref={rootRef} className={className}>
      {label ? (
        <span className="text-caption font-semibold text-[color:var(--color-black)]">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((value) => !value)}
        className={`field-control flex h-12 w-full items-center justify-between gap-3 bg-white px-4 text-left text-body ${
          open
            ? "border-[color:var(--color-brand)] ring-2 ring-[color:var(--color-brand)]/15"
            : "text-[color:var(--color-black)]"
        }`}
      >
        <span className={display ? "" : "text-subtitle"}>
          {display || placeholder}
        </span>
        <CalendarDays
          className="h-5 w-5 shrink-0 text-[color:var(--color-brand)]"
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          className="absolute left-0 right-0 top-full z-40 mt-2 rounded-card border border-[color:var(--color-line)] bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:p-5"
        >
          <DateRangeCalendar
            dateFrom={dateFrom}
            dateTo={dateTo}
            minDate={minDate}
            onChange={onChange}
          />
        </div>
      ) : null}
    </div>
  );
}
