import fs from "fs";
import path from "path";
import { isFeaturedCompany } from "./companies";
import {
  invalidateOffersCache,
  loadOffersBySlugMap,
  offersCacheMtimeMs,
} from "./load-offers-cache";
import { findSimilarCruises } from "./similar-cruises";
import { serializeCruisesForClient } from "./serialize-cruises";
import type { CruiseRecord } from "./types";

const OUTPUT_FILE = path.join(
  process.cwd(),
  "data",
  "cruise-search",
  "cruises_output.json"
);
const BACKUP_FILE = `${OUTPUT_FILE}.bak`;

let cachedCruises: CruiseRecord[] | null = null;
let cachedMtimeMs = 0;
let cachedClientLite: ReturnType<typeof serializeCruisesForClient> | null = null;
let cachedClientFull: ReturnType<typeof serializeCruisesForClient> | null = null;
let cachedOffersMtimeMs = 0;

function readMtimeMs(filePath = OUTPUT_FILE) {
  try {
    return fs.statSync(/*turbopackIgnore: true*/ filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export function invalidateCruiseCache() {
  cachedCruises = null;
  cachedClientLite = null;
  cachedClientFull = null;
  cachedMtimeMs = 0;
  cachedOffersMtimeMs = 0;
  invalidateOffersCache();
}

/** Recover truncated JSON arrays cut mid-sync (missing trailing `]`). */
function parseCruiseJson(raw: string): CruiseRecord[] | null {
  const text = raw.trim();
  if (!text) return [];

  const candidates = [
    text,
    text.startsWith("[") ? text : `[${text}]`,
    `${text.replace(/,\s*$/, "")}]`,
    `${text.startsWith("[") ? text : `[${text}`}`.replace(/,\s*$/, "") + "]",
  ];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed as CruiseRecord[];
    } catch {
      // try next
    }
  }

  // Walk back to the last complete object and close the array.
  let slice = text.startsWith("[") ? text : `[${text}`;
  while (true) {
    const end = slice.lastIndexOf("}");
    if (end < 0) return null;
    slice = slice.slice(0, end + 1).replace(/,\s*$/, "");
    try {
      const parsed: unknown = JSON.parse(`${slice}]`);
      if (Array.isArray(parsed)) return parsed as CruiseRecord[];
    } catch {
      slice = slice.slice(0, end);
    }
  }
}

function readCruiseFile(filePath: string): CruiseRecord[] | null {
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) return null;
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
    return parseCruiseJson(raw);
  } catch {
    return null;
  }
}

function filterFeatured(parsed: CruiseRecord[]) {
  const seenKeys = new Set<number>();
  return parsed.filter((cruise) => {
    if (!cruise || typeof cruise !== "object") return false;
    if (!isFeaturedCompany(cruise.cruise_title)) return false;
    if (seenKeys.has(cruise.key)) return false;
    seenKeys.add(cruise.key);
    return true;
  });
}

export function loadCruises() {
  const mtimeMs = readMtimeMs();
  if (cachedCruises && cachedMtimeMs === mtimeMs && mtimeMs > 0) {
    return cachedCruises;
  }

  let parsed =
    readCruiseFile(OUTPUT_FILE) ?? readCruiseFile(BACKUP_FILE) ?? [];

  // Prefer in-memory cache if disk is unreadable mid-write.
  if ((!parsed || parsed.length === 0) && cachedCruises?.length) {
    return cachedCruises;
  }

  cachedCruises = filterFeatured(parsed);
  cachedClientLite = null;
  cachedClientFull = null;
  cachedMtimeMs = mtimeMs || Date.now();
  return cachedCruises;
}

/** One cruise plus a few similar cards — does not serialize the full catalog. */
export function loadCruisePage(key: number) {
  const all = loadCruises();
  const raw = all.find((cruise) => cruise.key === key);
  if (!raw) return null;

  const offersBySlug = loadOffersBySlugMap();
  const [cruise] = serializeCruisesForClient([raw], offersBySlug);
  const similar = serializeCruisesForClient(
    findSimilarCruises(raw, all, 3),
    offersBySlug,
    { includeOffers: false },
  );

  return { cruise, similar };
}

export function loadClientCruises(options?: { includeOffers?: boolean }) {
  const includeOffers = options?.includeOffers ?? false;
  const cruises = loadCruises();
  const mtimeMs = readMtimeMs();
  const offersMtime = offersCacheMtimeMs();
  const cacheSlot = includeOffers ? cachedClientFull : cachedClientLite;

  if (
    cacheSlot &&
    cachedMtimeMs === mtimeMs &&
    cachedOffersMtimeMs === offersMtime
  ) {
    return cacheSlot;
  }

  const serialized = serializeCruisesForClient(cruises, loadOffersBySlugMap(), {
    includeOffers,
  });
  if (includeOffers) cachedClientFull = serialized;
  else cachedClientLite = serialized;
  cachedMtimeMs = mtimeMs || cachedMtimeMs;
  cachedOffersMtimeMs = offersMtime;
  return serialized;
}
