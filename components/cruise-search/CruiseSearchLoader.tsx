"use client";

import { useEffect, useRef, useState } from "react";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import {
  readCruisesFromSessionCache,
  writeCruisesToSessionCache,
} from "@/lib/cruise-search/client-cruise-cache";
import CruiseSearchApp from "./CruiseSearchApp";
import CruiseSearchSkeleton from "./CruiseSearchSkeleton";

export default function CruiseSearchLoader() {
  const hadCacheOnMount = useRef(readCruisesFromSessionCache() !== null);
  const [cruises, setCruises] = useState<CruiseRecord[] | null>(
    readCruisesFromSessionCache
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/cruises")
      .then(async (response) => {
        const data = (await response.json()) as {
          cruises?: CruiseRecord[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Не вдалося завантажити круїзи.");
        }

        return data.cruises ?? [];
      })
      .then((items) => {
        if (cancelled || items.length === 0) return;

        setCruises(items);
        writeCruisesToSessionCache(items);
      })
      .catch((fetchError) => {
        if (cancelled) return;

        if (!hadCacheOnMount.current) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Не вдалося завантажити круїзи."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="bg-background pb-16 pt-28 sm:pt-32">
        <div className="container-px mx-auto max-w-[1180px] py-20 text-center">
          <p className="text-body text-subtitle">{error}</p>
        </div>
      </main>
    );
  }

  if (!cruises) {
    return <CruiseSearchSkeleton />;
  }

  return <CruiseSearchApp cruises={cruises} />;
}
