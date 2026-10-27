import type { CruiseRecord } from "./types";

export const CRUISES_CACHE_KEY = "vcruise:cruises-cache:v2";

/** sessionStorage ліміт ~5MB — не зберігаємо гігантський JSON. */
const MAX_CACHE_BYTES = 4_500_000;

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
    const payload = JSON.stringify({ savedAt: Date.now(), cruises });
    if (payload.length > MAX_CACHE_BYTES) return;
    sessionStorage.setItem(CRUISES_CACHE_KEY, payload);
  } catch {
    // ignore quota / private mode
  }
}
