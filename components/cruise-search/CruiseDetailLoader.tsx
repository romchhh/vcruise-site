"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { parseCruiseDetailQuery } from "@/lib/cruise-search/cruise-detail-url";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import CruiseDetailApp from "./CruiseDetailApp";

export default function CruiseDetailLoader({
  cruise,
  similarCruises,
}: {
  cruise: CruiseRecord;
  similarCruises: CruiseRecord[];
}) {
  const searchParams = useSearchParams();
  const detailQuery = useMemo(() => {
    const params: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return parseCruiseDetailQuery(params);
  }, [searchParams]);

  return (
    <CruiseDetailApp
      cruise={cruise}
      similarCruises={similarCruises}
      detailQuery={detailQuery}
    />
  );
}
