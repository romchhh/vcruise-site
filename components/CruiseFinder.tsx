"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import FinderDatePanel, {
  type FinderDateState,
} from "@/components/cruise-finder/FinderDatePanel";
import { formatShortDate } from "@/lib/cruise-finder/calendar";
import { buildSearchParams } from "@/lib/cruise-search/params";
import { isMonthSelectable } from "@/lib/cruise-search/month-helpers";
import type { ContentBlock } from "@/lib/cms/store";

const regions = [
  "Середземномор'я",
  "Кариби",
  "Європа",
  "Аляска",
  "Інше",
];

const tripFormats = [
  "Романтична подорож",
  "Сімейний відпочинок",
  "Luxury",
  "Експедиція",
  "Не знаю",
];

const budgetOptions = [
  "до 3 000$",
  "до 5 000$",
  "до 7 000$",
  "до 10 000$",
  "будь-який",
];

type CruiseFinderProps = {
  section?: ContentBlock | null;
};

const travelerRows = [
  { key: "adults" as const, label: "Дорослі", hint: "Вік: від 18 р." },
  { key: "children" as const, label: "Діти", hint: "Вік: 2-18" },
  { key: "infants" as const, label: "Немовлята", hint: "До 2" },
];

function FinderChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`chip transition-colors ${
            value === item
              ? "chip-brand"
              : "chip-muted hover:bg-[color:var(--color-surface-hover)]"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function getMonthFieldLabel(state: FinderDateState) {
  const { selectedYear, selectedMonths } = state;
  if (selectedYear === "Будь-коли" && selectedMonths.length === 0) {
    return "Місяць";
  }
  if (selectedMonths.length === 0) {
    return selectedYear;
  }
  if (selectedMonths.length <= 2) {
    const yearPrefix =
      selectedYear !== "Будь-коли" ? `${selectedYear}, ` : "";
    return `${yearPrefix}${selectedMonths.join(", ")}`;
  }
  const yearPrefix = selectedYear !== "Будь-коли" ? `${selectedYear}, ` : "";
  return `${yearPrefix}${selectedMonths.length} міс.`;
}

function getDatesFieldLabel(state: FinderDateState) {
  const { dateFrom, dateTo } = state;
  if (!dateFrom) return "Оберіть дати";
  if (!dateTo) return `${formatShortDate(dateFrom)} – …`;
  return `${formatShortDate(dateFrom)} – ${formatShortDate(dateTo)}`;
}

export default function CruiseFinder({ section }: CruiseFinderProps) {
  const router = useRouter();
  const dateSectionRef = useRef<HTMLDivElement>(null);

  const [region, setRegion] = useState(regions[0]);
  const [tripFormat, setTripFormat] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [counts, setCounts] = useState({ adults: 0, children: 0, infants: 0 });
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [dateState, setDateState] = useState<FinderDateState>(() => {
    const now = new Date();
    return {
      selectedYear: "Будь-коли",
      selectedMonths: [],
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth(),
      dateFrom: "",
      dateTo: "",
    };
  });

  useEffect(() => {
    if (!datePanelOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!dateSectionRef.current?.contains(event.target as Node)) {
        setDatePanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [datePanelOpen]);

  const updateCount = (
    key: "adults" | "children" | "infants",
    delta: number
  ) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const patchDateState = (patch: Partial<FinderDateState>) => {
    setDateState((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = () => {
    const months = dateState.selectedMonths.filter((month) =>
      isMonthSelectable(month, dateState.selectedYear)
    );

    const adults = counts.adults || 2;

    const query = buildSearchParams({
      regions: [region],
      year: dateState.selectedYear,
      months,
      dateFrom: dateState.dateFrom,
      dateTo: dateState.dateTo,
      adults,
      children: counts.children,
      infants: counts.infants,
    });

    router.push(query ? `/search?${query}` : "/search");
  };

  const monthLabel = getMonthFieldLabel(dateState);
  const datesLabel = getDatesFieldLabel(dateState);
  const monthHasValue =
    dateState.selectedYear !== "Будь-коли" || dateState.selectedMonths.length > 0;
  const datesHasValue = Boolean(dateState.dateFrom);

  return (
    <section id="cruise-finder" className="section-frame">
      <div className="overflow-hidden rounded-shell bg-[color:var(--color-brand)] py-14 sm:py-20 lg:rounded-shell-lg lg:py-24">
        <div className="container-px mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 overflow-hidden rounded-[24px] bg-white lg:grid-cols-2 lg:rounded-shell">
            <div className="relative min-h-[360px] lg:min-h-[720px]">
              <Image
                src={section?.image || "/images/cruise-finder.jpg"}
                alt={section?.imageAlt || "Мальовнича прибережна дорога"}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={false}
                unoptimized={Boolean(section?.image?.startsWith("/api/media/"))}
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/15"
                aria-hidden
              />

              <div className="relative z-10 flex flex-col px-6 pb-8 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-caption font-semibold text-[color:var(--color-brand)]">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]"
                    aria-hidden
                  />
                  {section?.badge || "Підібрати круїз"}
                </span>

                <h2 className="text-h2 mt-6 max-w-md text-white lg:mt-8">
                  {section?.title || "Не знаєте, який круїз обрати?"}
                  {(section?.titleLine2 || !section) && (
                    <>
                      <br />
                      {section?.titleLine2 || "Ми підберемо його за вас"}
                    </>
                  )}
                </h2>
                <p className="text-body mt-4 max-w-md text-white/80">
                  {section?.description ||
                    "Розкажіть трохи про свою майбутню подорож — ми підберемо варіанти відповідно до ваших побажань, бюджету та формату відпочинку."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-0 p-6 sm:p-8 lg:p-10">
              <div className="finder-form-section">
                <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                  Куди хочете?
                </p>
                <FinderChips
                  options={regions}
                  value={region}
                  onChange={setRegion}
                />
              </div>

              <div ref={dateSectionRef} className="finder-form-section">
                <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                  Коли плануєте подорож?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDatePanelOpen((open) => !open)}
                    className={`finder-select-pill ${
                      datePanelOpen ? "finder-select-pill--active" : ""
                    }`}
                  >
                    <span
                      className={
                        monthHasValue
                          ? "text-caption text-[color:var(--color-black)]"
                          : "text-caption text-subtitle"
                      }
                    >
                      {monthLabel}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[color:var(--color-brand)] transition-transform ${
                        datePanelOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePanelOpen(true)}
                    className={`finder-select-pill ${
                      datePanelOpen ? "finder-select-pill--active" : ""
                    }`}
                  >
                    <span
                      className={
                        datesHasValue
                          ? "text-caption text-[color:var(--color-black)]"
                          : "text-caption text-subtitle"
                      }
                    >
                      {datesLabel}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[color:var(--color-brand)] transition-transform ${
                        datePanelOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {datePanelOpen ? (
                  <FinderDatePanel state={dateState} onChange={patchDateState} />
                ) : null}
              </div>

              <div className="finder-form-section">
                <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                  Скільки людей подорожує?
                </p>
                <div className="space-y-1">
                  {travelerRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-4 py-2"
                    >
                      <div>
                        <p className="text-caption font-semibold text-[color:var(--color-black)]">
                          {row.label}
                        </p>
                        <p className="text-small mt-0.5 normal-case text-subtitle">
                          {row.hint}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`Зменшити ${row.label}`}
                          onClick={() => updateCount(row.key, -1)}
                          className="btn-control"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <span className="text-caption min-w-[12px] text-center font-medium text-[color:var(--color-black)]">
                          {counts[row.key]}
                        </span>
                        <button
                          type="button"
                          aria-label={`Збільшити ${row.label}`}
                          onClick={() => updateCount(row.key, 1)}
                          className="btn-control"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="finder-form-section">
                <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                  Який формат відпочинку вам ближче?
                </p>
                <FinderChips
                  options={tripFormats}
                  value={tripFormat}
                  onChange={setTripFormat}
                />
              </div>

              <div className="finder-form-section finder-form-section--last">
                <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                  Ваш бюджет
                </p>
                <FinderChips
                  options={budgetOptions}
                  value={budget}
                  onChange={setBudget}
                />
              </div>

              <button
                type="button"
                className="btn-primary btn-primary--block mt-8 lg:mt-10"
                onClick={handleSubmit}
              >
                Підібрати круїз
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
