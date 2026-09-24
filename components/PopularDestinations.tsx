"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { destinations } from "@/data/destinations";
import DestinationCard from "./DestinationCard";
import type { Destination } from "@/types";

const DestinationModal = dynamic(
  () => import("./destinations/DestinationModal"),
  { ssr: false }
);

export default function PopularDestinations() {
  const [activeDestination, setActiveDestination] = useState<Destination | null>(
    null
  );

  return (
    <section id="destinations" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Найпопулярніші напрямки</span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              Ваш наступний маршрут може бути тут
            </h2>
            <p className="text-body text-subtitle mt-4">
              Ваш наступний маршрут уже може бути тут. Добірка актуальних
              круїзів на найближчі дати. Обирайте напрямок, лайнер або формат
              подорожі — а ми допоможемо розібратися в деталях і підібрати
              найкращий варіант.
            </p>
          </div>
        </div>

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
