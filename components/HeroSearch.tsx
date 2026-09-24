"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Minus, Plus } from "lucide-react";
import { isMonthSelectable } from "@/lib/cruise-search/month-helpers";
import { buildSearchParams } from "@/lib/cruise-search/params";

type FieldKey = "where" | "when" | "duration" | "who";

const destinations = [
  "Будь-який",
  "Південна Європа",
  "Північна Європа",
  "Африка",
  "Азія",
  "Австралія та Океанія",
  "Трансатлантичні круїзи",
];

const years = ["Будь-коли", "2026", "2027", "2028"];

const months = [
  "Січ",
  "Лют",
  "Бер",
  "Квіт",
  "Трав",
  "Черв",
  "Лип",
  "Серп",
  "Вер",
  "Жовт",
  "Лист",
  "Груд",
];

const durations = [
  "Будь-яка",
  "1-7 ночей",
  "8-14 ночей",
  "15-21 ночей",
  "22+ ночей",
];

const travelers = [
  { key: "adults" as const, label: "Дорослі", hint: "Вік: від 18 р." },
  { key: "children" as const, label: "Діти", hint: "Вік: 2-18" },
  { key: "infants" as const, label: "Немовлята", hint: "До 2" },
];

const fields: Array<{ key: FieldKey; label: string; placeholder: string }> = [
  { key: "where", label: "Куди", placeholder: "Пошук напрямків" },
  { key: "when", label: "Коли", placeholder: "Додайте дати" },
  { key: "duration", label: "Тривалість", placeholder: "Оберіть кількість днів" },
  { key: "who", label: "Хто", placeholder: "Додайте подорожуючих" },
];

function Checkbox({
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
      className="flex w-full items-center gap-3 rounded-control px-1 py-2.5 text-left transition-colors hover:bg-[color:var(--color-surface-subtle)]"
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

export default function HeroSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLDivElement>>>({});
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState("Будь-коли");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState("Будь-яка");
  const [counts, setCounts] = useState({ adults: 0, children: 0, infants: 0 });

  useEffect(() => {
    setMounted(true);
    router.prefetch("/search");
    void fetch("/api/cruises");
  }, [router]);

  useEffect(() => {
    if (!activeField) return;

    const updatePosition = () => {
      const anchor = fieldRefs.current[activeField];
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const gap = 12;
      const viewportPadding = 16;
      const widths: Record<FieldKey, number> = {
        where: 280,
        when: 320,
        duration: 260,
        who: 300,
      };
      const width = Math.min(widths[activeField], window.innerWidth - viewportPadding * 2);
      let left = rect.left;

      if (activeField === "who") {
        left = rect.right - width;
      }

      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - width - viewportPadding)
      );

      const spaceAbove = rect.top - gap;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceAbove >= spaceBelow;

      setDropdownStyle({
        position: "fixed",
        left,
        width,
        zIndex: 120,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeField]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-hero-search-dropdown]")
      ) {
        return;
      }
      setActiveField(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveField(null);
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleDestination = (value: string) => {
    if (value === "Будь-який") {
      setSelectedDestinations([]);
      return;
    }

    setSelectedDestinations((prev) => {
      const withoutDefault = prev.filter((item) => item !== "Будь-який");
      return withoutDefault.includes(value)
        ? withoutDefault.filter((item) => item !== value)
        : [...withoutDefault, value];
    });
  };

  const toggleMonth = (month: string) => {
    if (!isMonthSelectable(month, selectedYear)) return;

    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((item) => item !== month)
        : [...prev, month]
    );
  };

  const updateCount = (
    key: "adults" | "children" | "infants",
    delta: number
  ) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const getFieldValue = (key: FieldKey) => {
    switch (key) {
      case "where":
        if (selectedDestinations.length === 0) return fields[0].placeholder;
        if (selectedDestinations.length === 1) return selectedDestinations[0];
        return `${selectedDestinations.length} напрямки`;
      case "when":
        if (selectedYear === "Будь-коли" && selectedMonths.length === 0) {
          return fields[1].placeholder;
        }
        if (selectedMonths.length === 0) return selectedYear;
        if (selectedMonths.length <= 2) {
          return `${selectedYear !== "Будь-коли" ? `${selectedYear}, ` : ""}${selectedMonths.join(", ")}`;
        }
        return `${selectedYear !== "Будь-коли" ? `${selectedYear}, ` : ""}${selectedMonths.length} міс.`;
      case "duration":
        return selectedDuration === "Будь-яка"
          ? fields[2].placeholder
          : selectedDuration;
      case "who": {
        const total = counts.adults + counts.children + counts.infants;
        return total === 0 ? fields[3].placeholder : `${total} подорожуючих`;
      }
    }
  };

  const handleSearch = () => {
    setActiveField(null);
    const months = selectedMonths.filter((month) =>
      isMonthSelectable(month, selectedYear)
    );

    const query = buildSearchParams({
      regions: selectedDestinations.filter((item) => item !== "Будь-який"),
      year: selectedYear,
      months,
      duration: selectedDuration,
      adults: counts.adults,
      children: counts.children,
      infants: counts.infants,
    });

    router.push(query ? `/search?${query}` : "/search");
  };

  const renderDropdownContent = (key: FieldKey) => {
    if (key === "where") {
      return (
        <>
          {destinations.map((item) => (
            <Checkbox
              key={item}
              label={item}
              checked={
                item === "Будь-який"
                  ? selectedDestinations.length === 0
                  : selectedDestinations.includes(item)
              }
              onChange={() => toggleDestination(item)}
            />
          ))}
        </>
      );
    }

    if (key === "when") {
      return (
        <>
          {years.map((year) => (
            <Checkbox
              key={year}
              label={year}
              checked={selectedYear === year}
              onChange={() => {
                setSelectedYear(year);
                setSelectedMonths((prev) =>
                  prev.filter((month) => isMonthSelectable(month, year))
                );
              }}
            />
          ))}

          <div className="divider mt-3 grid grid-cols-4 gap-2 pt-4">
            {months.map((month) => {
              const selected = selectedMonths.includes(month);
              const selectable = isMonthSelectable(month, selectedYear);
              return (
                <button
                  key={month}
                  type="button"
                  disabled={!selectable}
                  onClick={() => toggleMonth(month)}
                  className={`text-small normal-case rounded-full border px-2 py-2 font-medium transition-colors ${
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
        </>
      );
    }

    if (key === "duration") {
      return (
        <>
          {durations.map((item) => (
            <Checkbox
              key={item}
              label={item}
              checked={selectedDuration === item}
              onChange={() => setSelectedDuration(item)}
            />
          ))}
        </>
      );
    }

    return (
      <>
        {travelers.map((traveler) => (
          <div
            key={traveler.key}
            className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-1"
          >
            <div>
              <p className="text-caption font-semibold text-[color:var(--color-black)]">
                {traveler.label}
              </p>
              <p className="text-small mt-1.5 normal-case text-[color:var(--color-silver)]">
                {traveler.hint}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Зменшити кількість ${traveler.label.toLowerCase()}`}
                onClick={() => updateCount(traveler.key, -1)}
                className="btn-control"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <span className="text-caption min-w-[12px] text-center font-medium text-[color:var(--color-black)]">
                {counts[traveler.key]}
              </span>
              <button
                type="button"
                aria-label={`Збільшити кількість ${traveler.label.toLowerCase()}`}
                onClick={() => updateCount(traveler.key, 1)}
                className="btn-control"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </>
    );
  };

  const dropdownPortal =
    mounted && activeField
      ? createPortal(
          <div
            data-hero-search-dropdown
            style={dropdownStyle}
            className="rounded-panel bg-white p-4 shadow-[0_16px_48px_rgba(0,0,0,0.14)]"
          >
            {renderDropdownContent(activeField)}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className="container-px relative z-10 mx-auto w-full max-w-[1400px] overflow-visible pb-8 sm:pb-10 lg:pb-12"
      >
        <div className="flex flex-col rounded-[28px] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] sm:h-[72px] sm:flex-row sm:items-center sm:rounded-full sm:p-1.5 lg:mx-auto lg:h-[76px] lg:max-w-[1180px] lg:p-2">
          {fields.map((field, i) => {
            const isActive = activeField === field.key;
            const value = getFieldValue(field.key);
            const hasValue = value !== field.placeholder;

            return (
              <div
                key={field.key}
                ref={(node) => {
                  fieldRefs.current[field.key] = node ?? undefined;
                }}
                className={`relative flex min-w-0 flex-1 sm:self-stretch ${
                  i !== 0
                    ? "sm:border-l sm:border-[color:var(--color-border-input)]"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setActiveField((current) =>
                      current === field.key ? null : field.key
                    )
                  }
                  className={`flex h-full w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition-colors sm:px-4 sm:py-0 lg:px-5 ${
                    i === 0 ? "sm:rounded-l-full sm:pl-7 lg:pl-8" : ""
                  } ${
                    isActive
                      ? "bg-[color:var(--color-surface-subtle)]"
                      : "hover:bg-[color:var(--color-surface-subtle)]/70"
                  }`}
                  aria-expanded={isActive}
                >
                  <div className="min-w-0">
                    <p className="text-body font-semibold text-[color:var(--color-black)]">
                      {field.label}
                    </p>
                    <p
                      className={`text-caption mt-1 truncate ${
                        hasValue
                          ? "text-[color:var(--color-black)]"
                          : "text-[color:var(--color-silver)]"
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-[color:var(--color-silver)] transition-transform duration-200 ${
                      isActive ? "rotate-180" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            aria-label="Знайти круїз"
            onClick={handleSearch}
            className="btn-icon mt-1 h-11 w-full shrink-0 sm:mt-0 sm:h-[60px] sm:w-[60px]"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {dropdownPortal}
    </>
  );
}
