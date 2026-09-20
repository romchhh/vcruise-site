"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { packageTours } from "@/data/tours";
import TourCard from "./TourCard";
import type { PackageTour } from "@/types";

const PackageTourModal = dynamic(
  () => import("./package-tours/PackageTourModal"),
  { ssr: false }
);

export default function PackageTours() {
  const [activeTour, setActiveTour] = useState<PackageTour | null>(null);

  return (
    <section id="package-tours" className="bg-background py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Пакетні тури</span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              Подорожі, створені під вас
            </h2>
            <p className="text-body text-subtitle mt-4">
              Не тільки круїзи. Ми створюємо готові пакетні тури, поєднуючи
              готелі, перельоти, трансфери, екскурсії та інші послуги в одну
              комфортну подорож.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {packageTours.map((tour) => (
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
