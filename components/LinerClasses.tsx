"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { linerClasses } from "@/data/liner-classes";
import LinerClassCard from "./LinerClassCard";
import type { LinerClass } from "@/types";

const LinerClassModal = dynamic(
  () => import("./liner-classes/LinerClassModal"),
  { ssr: false }
);

export default function LinerClasses() {
  const [activeClass, setActiveClass] = useState<LinerClass | null>(null);

  return (
    <section id="liners" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Класи лайнерів</span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              Оберіть свій клас лайнера
            </h2>
            <p className="type-section-lead text-subtitle mt-4">
              Не всі лайнери однакові: від мегалайнерів з аквапарками до
              камерних преміальних суден. Ми допоможемо зрозуміти відмінності та
              обрати формат подорожі саме для вас.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 items-stretch gap-2.5 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {linerClasses.map((linerClass) => (
            <LinerClassCard
              key={linerClass.id}
              linerClass={linerClass}
              onOpenDetails={() => setActiveClass(linerClass)}
            />
          ))}
        </div>
      </div>

      <LinerClassModal
        linerClass={activeClass}
        onClose={() => setActiveClass(null)}
      />
    </section>
  );
}
