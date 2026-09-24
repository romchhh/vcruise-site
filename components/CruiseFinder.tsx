"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { buildSearchParams } from "@/lib/cruise-search/params";

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
              : "chip-muted-brand hover:bg-[color:var(--color-surface-hover)]"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default function CruiseFinder() {
  const router = useRouter();
  const [region, setRegion] = useState(regions[0]);
  const [tripFormat, setTripFormat] = useState<string | null>(null);
  const [travelers, setTravelers] = useState(2);

  return (
    <section id="cruise-finder" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="relative min-h-[520px] overflow-hidden rounded-card lg:min-h-[640px]">
            <Image
              src="/images/cruise-finder.jpg"
              alt="Мальовнича прибережна дорога"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

            <div className="absolute left-5 top-5 sm:left-6 sm:top-6">
              <span className="section-badge">Підібрати круїз</span>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-24 sm:px-8 sm:pb-10">
              <h2 className="text-h3 max-w-md text-white">
                Не знаєте, який круїз обрати?
                <br />
                Ми підберемо його за вас
              </h2>
              <p className="text-body mt-4 max-w-md text-white/85">
                Розкажіть трохи про свою майбутню подорож — ми підберемо
                варіанти відповідно до ваших побажань, бюджету та формату
                відпочинку.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-card bg-white p-6 sm:p-8 lg:gap-7">
            <div>
              <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                Куди хочете?
              </p>
              <FinderChips
                options={regions}
                value={region}
                onChange={setRegion}
              />
            </div>

            <div>
              <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                Коли плануєте подорож?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="field-pill">
                  <span className="text-caption text-[color:var(--color-brand)]">
                    Дата
                  </span>
                  <ChevronDown
                    className="h-4 w-4 text-[color:var(--color-brand)]"
                    strokeWidth={2}
                  />
                </button>
                <button type="button" className="field-pill">
                  <span className="text-caption text-[color:var(--color-brand)]">
                    Місяць
                  </span>
                  <ChevronDown
                    className="h-4 w-4 text-[color:var(--color-brand)]"
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>

            <div>
              <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                Скільки людей подорожує?
              </p>
              <div className="field-pill">
                <span className="text-caption text-[color:var(--color-brand)]">
                  {travelers} дорослих
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Зменшити кількість"
                    onClick={() => setTravelers((value) => Math.max(1, value - 1))}
                    className="btn-control"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Збільшити кількість"
                    onClick={() => setTravelers((value) => value + 1)}
                    className="btn-control"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                Який формат відпочинку вам ближче?
              </p>
              <FinderChips
                options={tripFormats}
                value={tripFormat}
                onChange={setTripFormat}
              />
            </div>

            <div>
              <p className="text-body mb-3 font-semibold text-[color:var(--color-black)]">
                Ваш бюджет
              </p>
              <div className="field-pill">
                <input
                  type="text"
                  placeholder="Наприклад, $1,500 – $3,000 за особу"
                  className="text-caption w-full bg-transparent text-[color:var(--color-brand)] outline-none placeholder:text-[color:var(--color-brand)]/60"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-primary btn-primary--block"
              onClick={() => {
                const query = buildSearchParams({
                  regions: [region],
                  adults: travelers,
                });
                router.push(query ? `/search?${query}` : "/search");
              }}
            >
              Підібрати круїз
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
