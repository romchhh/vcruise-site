"use client";

import { useEffect, useState } from "react";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import CruiseSearchApp from "./CruiseSearchApp";

const CRUISES_CACHE_KEY = "vcruise:cruises-cache:v1";
const CRUISES_CACHE_TTL_MS = 60 * 60 * 1000;

type CruisesCache = {
  savedAt: number;
  cruises: CruiseRecord[];
};

export default function CruiseSearchLoader() {
  const [cruises, setCruises] = useState<CruiseRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    try {
      const cachedRaw = sessionStorage.getItem(CRUISES_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as CruisesCache;
        if (
          Array.isArray(cached.cruises) &&
          Date.now() - cached.savedAt < CRUISES_CACHE_TTL_MS
        ) {
          setCruises(cached.cruises);
        }
      }
    } catch {
      // ignore cache read errors
    }

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
        if (!cancelled) {
          setCruises(items);
          try {
            sessionStorage.setItem(
              CRUISES_CACHE_KEY,
              JSON.stringify({ savedAt: Date.now(), cruises: items })
            );
          } catch {
            // ignore cache write errors
          }
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
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
    return (
      <main className="bg-background pb-16 pt-28 sm:pt-32">
        <div className="container-px mx-auto max-w-[1180px] py-20 text-center text-body text-subtitle">
          Завантаження пошуку...
        </div>
      </main>
    );
  }

  return <CruiseSearchApp cruises={cruises} />;
}
