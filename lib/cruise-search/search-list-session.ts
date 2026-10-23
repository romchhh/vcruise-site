const STORAGE_KEY = "vcruise:search-list-state:v1";

export type SearchListSessionState = {
  listQuery: string;
  scrollY: number;
  visibleCount: number;
  savedAt: number;
};

export function saveSearchListState(state: {
  listQuery: string;
  scrollY: number;
  visibleCount: number;
}) {
  if (typeof window === "undefined") return;

  try {
    const payload: SearchListSessionState = {
      ...state,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function restoreSearchListState(
  currentListQuery: string,
): SearchListSessionState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SearchListSessionState;
    if (parsed.listQuery !== currentListQuery) return null;
    if (Date.now() - parsed.savedAt > 30 * 60 * 1000) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearSearchListState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
