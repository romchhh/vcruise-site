"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import TourCard from "./TourCard";
import SectionIntro from "./SectionIntro";
import { resolvePackageTours } from "@/lib/cms/section-items";
import type { ContentBlock } from "@/lib/cms/store";
import type { PackageTour } from "@/types";

const PackageTourModal = dynamic(
  () => import("./package-tours/PackageTourModal"),
  { ssr: false }
);

export default function PackageTours({
  section,
}: {
  section?: ContentBlock | null;
}) {
  const list = useMemo(() => resolvePackageTours(section), [section]);
  const [activeTour, setActiveTour] = useState<PackageTour | null>(null);

  return (
    <section id="package-tours" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <SectionIntro
          block={section}
          fallbackBadge="Пакетні тури"
          fallbackTitle="Подорожі, створені під вас"
          fallbackDescription="Не тільки круїзи. Ми створюємо готові пакетні тури, поєднуючи готелі, перельоти, трансфери, екскурсії та інші послуги в одну комфортну подорож."
        />

        <div className="mt-14 grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {list.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onDetail={() => setActiveTour(tour)}
            />
          ))}
        </div>
      </div>

      <PackageTourModal tour={activeTour} onClose={() => setActiveTour(null)} />
    </section>
  );
}
