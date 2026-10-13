import type { CruiseRecord } from "./types";

export const CRUISES_CACHE_KEY = "vcruise:cruises-cache:v1";

type CruisesCache = {
  savedAt: number;
  cruises: CruiseRecord[];
};

export function readCruisesFromSessionCache(): CruiseRecord[] | null {
  if (typeof window === "undefined") return null;

  try {
    const cachedRaw = sessionStorage.getItem(CRUISES_CACHE_KEY);
    if (!cachedRaw) return null;

    const cached = JSON.parse(cachedRaw) as CruisesCache;
    if (!Array.isArray(cached.cruises) || cached.cruises.length === 0) {
      return null;
    }

    return cached.cruises;
  } catch {
    return null;
  }
}

export function writeCruisesToSessionCache(cruises: CruiseRecord[]) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      CRUISES_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), cruises })
    );
  } catch {
    // ignore quota / private mode
  }
}
