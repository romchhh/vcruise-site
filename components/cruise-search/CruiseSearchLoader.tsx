"use client";

import { useEffect, useState } from "react";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import CruiseSearchApp from "./CruiseSearchApp";

export default function CruiseSearchLoader() {
  const [cruises, setCruises] = useState<CruiseRecord[] | null>(null);
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
        if (!cancelled) {
          setCruises(items);
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
