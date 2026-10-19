"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { destinations } from "@/data/destinations";
import DestinationCard from "./DestinationCard";
import SectionIntro from "./SectionIntro";
import type { ContentBlock } from "@/lib/cms/store";
import type { Destination } from "@/types";

const DestinationModal = dynamic(
  () => import("./destinations/DestinationModal"),
  { ssr: false }
);

export default function PopularDestinations({
  section,
}: {
  section?: ContentBlock | null;
}) {
  const [activeDestination, setActiveDestination] = useState<Destination | null>(
    null
  );

  return (
    <section id="destinations" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <SectionIntro
          block={section}
          fallbackBadge="Найпопулярніші напрямки"
          fallbackTitle="Ваш наступний маршрут може бути тут"
          fallbackDescription="Добірка актуальних круїзів на найближчі дати. Обирайте напрямок, лайнер або формат подорожі — допоможемо розібратися в деталях і підібрати найкращий варіант."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {destinations.map((destination) => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              onDetail={() => setActiveDestination(destination)}
            />
          ))}
        </div>
      </div>

      <DestinationModal
        destination={activeDestination}
        onClose={() => setActiveDestination(null)}
      />
    </section>
  );
}
