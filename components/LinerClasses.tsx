"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import LinerClassCard from "./LinerClassCard";
import SectionIntro from "./SectionIntro";
import { resolveLinerClasses } from "@/lib/cms/section-items";
import type { ContentBlock } from "@/lib/cms/store";
import type { LinerClass } from "@/types";

const LinerClassModal = dynamic(
  () => import("./liner-classes/LinerClassModal"),
  { ssr: false }
);

export default function LinerClasses({
  section,
}: {
  section?: ContentBlock | null;
}) {
  const list = useMemo(() => resolveLinerClasses(section), [section]);
  const [activeClass, setActiveClass] = useState<LinerClass | null>(null);

  return (
    <section id="liners" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <SectionIntro
          block={section}
          fallbackBadge="Класи лайнерів"
          fallbackTitle="Оберіть свій клас лайнера"
          fallbackDescription="Не всі лайнери однакові: від мегалайнерів з аквапарками до камерних преміальних суден. Ми допоможемо зрозуміти відмінності та обрати формат подорожі саме для вас."
        />

        <div className="mt-14 grid grid-cols-2 items-stretch gap-2.5 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {list.map((linerClass) => (
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
