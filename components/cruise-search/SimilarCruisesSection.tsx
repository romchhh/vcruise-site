"use client";

import { useRouter } from "next/navigation";
import { buildCruiseDetailPath } from "@/lib/cruise-search/cruise-detail-url";
import type { CruiseDetailQuery } from "@/lib/cruise-search/cruise-detail-url";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import CruiseSearchResultCard from "./CruiseSearchResultCard";

export default function SimilarCruisesSection({
  similarCruises,
  detailQuery,
}: {
  similarCruises: CruiseRecord[];
  detailQuery: CruiseDetailQuery;
}) {
  const router = useRouter();

  if (!similarCruises.length) return null;

  const openCruise = (next: CruiseRecord, preferredDate?: string) => {
    router.push(
      buildCruiseDetailPath(next.key, {
        listQuery: detailQuery.from,
        sailing: preferredDate,
        currency: detailQuery.currency,
        adults: detailQuery.adults,
        children: detailQuery.children,
        infants: detailQuery.infants,
      }),
    );
  };

  return (
    <section className="mt-12 border-t border-[color:var(--color-line)] pt-10 sm:mt-14 sm:pt-12">
      <h2 className="text-h3 font-bold text-[color:var(--color-black)]">
        Схожі круїзи
      </h2>
      <p className="text-body text-subtitle mt-2 max-w-2xl">
        Інші варіанти в тому ж регіоні або від тієї ж компанії.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {similarCruises.map((item) => (
          <CruiseSearchResultCard
            key={item.key}
            cruise={item}
            currency={detailQuery.currency}
            onOpen={openCruise}
          />
        ))}
      </div>
    </section>
  );
}
