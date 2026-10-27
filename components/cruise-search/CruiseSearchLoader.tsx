"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchJsonWithRetry,
  normalizeClientFetchError,
} from "@/lib/cruise-search/fetch-with-retry";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import {
  readCruisesFromSessionCache,
  writeCruisesToSessionCache,
} from "@/lib/cruise-search/client-cruise-cache";
import CruiseSearchApp from "./CruiseSearchApp";
import CruiseSearchSkeleton from "./CruiseSearchSkeleton";

type CruisesResponse = {
  cruises?: CruiseRecord[];
  error?: string;
};

export default function CruiseSearchLoader() {
  const hadCacheOnMount = useRef(readCruisesFromSessionCache() !== null);
  const [cruises, setCruises] = useState<CruiseRecord[] | null>(
    readCruisesFromSessionCache,
  );
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const showRefreshBanner = Boolean(cruises?.length);
    if (showRefreshBanner) setRefreshing(true);

    void (async () => {
      try {
        const data = await fetchJsonWithRetry<CruisesResponse>("/api/cruises", {
          retries: 3,
          timeoutMs: 120_000,
          init: { cache: "default" },
        });

        if (cancelled) return;

        const items = data.cruises ?? [];
        if (items.length === 0) {
          throw new Error("Каталог круїзів порожній. Спробуйте пізніше.");
        }

        setCruises(items);
        writeCruisesToSessionCache(items);
        setError("");
      } catch (fetchError) {
        if (cancelled) return;

        if (!hadCacheOnMount.current && !cruises?.length) {
          setError(normalizeClientFetchError(fetchError));
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only on explicit retry
  }, [reloadToken]);

  const retry = useCallback(() => {
    hadCacheOnMount.current = Boolean(cruises?.length);
    setError("");
    setReloadToken((token) => token + 1);
  }, [cruises?.length]);

  if (error && !cruises?.length) {
    return (
      <main className="bg-background pb-16 pt-28 sm:pt-32">
        <div className="container-px mx-auto max-w-[1180px] py-16 text-center sm:py-20">
          <div className="mx-auto max-w-lg rounded-card border border-[color:var(--color-line)] bg-white px-6 py-10 sm:px-8">
            <p className="text-h4 font-bold text-[color:var(--color-black)]">
              Не вдалося завантажити каталог
            </p>
            <p className="text-body text-subtitle mt-3">{error}</p>
            <p className="text-caption mt-4 text-subtitle">
              Часто це слабкий мобільний інтернет або велика відповідь сервера.
              Повторна спроба зазвичай допомагає.
            </p>
            <button type="button" onClick={retry} className="btn-primary mt-8">
              Спробувати знову
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!cruises?.length) {
    return <CruiseSearchSkeleton />;
  }

  return (
    <>
      {refreshing ? (
        <div
          className="border-b border-[color:var(--color-line)] bg-[color:var(--color-brand-light)]"
          role="status"
        >
          <p className="container-px mx-auto max-w-[1180px] py-2 text-center text-caption font-medium text-[color:var(--color-brand)]">
            Оновлюємо каталог круїзів…
          </p>
        </div>
      ) : null}
      <CruiseSearchApp cruises={cruises} />
    </>
  );
}
