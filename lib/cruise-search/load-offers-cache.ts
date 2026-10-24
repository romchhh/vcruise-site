import fs from "fs";
import path from "path";
import { bookingUrlToSlug } from "./fourgates-offers";
import { normalizeCruiseCabinOffer } from "./offer-key";
import type { CruiseCabinOffer } from "./types";

const OFFERS_FILE = path.join(
  process.cwd(),
  "data",
  "cruise-search",
  "offers_by_slug.json",
);

export type OffersCacheMeta = {
  updatedAt?: string;
  horizonDays?: number;
  slugCount?: number;
};

type SlugEntry = {
  fetchedAt?: string;
  offers?: CruiseCabinOffer[];
};

type OffersFile = {
  meta?: OffersCacheMeta;
  offers?: Record<string, SlugEntry | CruiseCabinOffer[]>;
};

let cachedMap: Map<string, CruiseCabinOffer[]> | null = null;
let cachedMeta: OffersCacheMeta | null = null;
let cachedMtimeMs = 0;

export function invalidateOffersCache() {
  cachedMap = null;
  cachedMeta = null;
  cachedMtimeMs = 0;
}

export function offersCacheMtimeMs() {
  return readMtimeMs();
}

function readMtimeMs() {
  try {
    return fs.statSync(/*turbopackIgnore: true*/ OFFERS_FILE).mtimeMs;
  } catch {
    return 0;
  }
}

function isUsableOffer(offer: CruiseCabinOffer) {
  const tariff = normalizeCruiseCabinOffer(offer).tariffName.trim();
  if (tariff === "Array" || /₴|€|\$/.test(tariff)) return false;
  return Object.values(offer.price ?? {}).some(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
}

function normalizeEntry(
  entry: SlugEntry | CruiseCabinOffer[] | undefined,
): CruiseCabinOffer[] {
  if (!entry) return [];
  const rows = Array.isArray(entry) ? entry : (entry.offers ?? []);
  return rows.map((offer) => normalizeCruiseCabinOffer(offer)).filter(isUsableOffer);
}

export function loadOffersCacheMeta(): OffersCacheMeta | null {
  loadOffersBySlugMap();
  return cachedMeta;
}

export function loadOffersBySlugMap(): Map<string, CruiseCabinOffer[]> {
  const mtimeMs = readMtimeMs();
  if (cachedMap && cachedMtimeMs === mtimeMs && mtimeMs > 0) {
    return cachedMap;
  }

  if (!mtimeMs) {
    cachedMap = new Map();
    cachedMeta = null;
    cachedMtimeMs = 0;
    return cachedMap;
  }

  try {
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ OFFERS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as OffersFile;
    const map = new Map<string, CruiseCabinOffer[]>();
    const offers = parsed.offers ?? {};
    for (const [slug, entry] of Object.entries(offers)) {
      const rows = normalizeEntry(entry);
      if (rows.length) map.set(slug, rows);
    }
    cachedMap = map;
    cachedMeta = parsed.meta ?? null;
    cachedMtimeMs = mtimeMs;
    return map;
  } catch {
    cachedMap = new Map();
    cachedMeta = null;
    cachedMtimeMs = mtimeMs;
    return cachedMap;
  }
}

/** Keep a live 2-adult quote so the next visit skips 4gates. */
export function rememberDiskOffers(
  bookingUrl: string,
  offers: CruiseCabinOffer[],
) {
  const slug = bookingUrlToSlug(bookingUrl);
  if (!slug || offers.length === 0) return;

  const map = loadOffersBySlugMap();
  const existing = map.get(slug);
  if (existing?.length && existing.every(isUsableOffer)) return;

  const rows = offers.map((offer) => normalizeCruiseCabinOffer(offer));
  map.set(slug, rows);

  let file: OffersFile = { meta: cachedMeta ?? {}, offers: {} };
  try {
    if (fs.existsSync(OFFERS_FILE)) {
      file = JSON.parse(fs.readFileSync(OFFERS_FILE, "utf-8")) as OffersFile;
    }
  } catch {
    file = { meta: {}, offers: {} };
  }

  file.offers = file.offers ?? {};
  file.offers[slug] = {
    fetchedAt: new Date().toISOString(),
    offers: rows,
  };
  file.meta = {
    ...(file.meta ?? {}),
    updatedAt: new Date().toISOString(),
    slugCount: Object.keys(file.offers).length,
  };

  const dir = path.dirname(OFFERS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${OFFERS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(file));
  fs.renameSync(tmp, OFFERS_FILE);
  cachedMap = map;
  cachedMeta = file.meta ?? null;
  cachedMtimeMs = readMtimeMs();
}

export function offersForBookingUrl(
  bookingUrl: string,
  offersBySlug: ReadonlyMap<string, CruiseCabinOffer[]> = loadOffersBySlugMap(),
): CruiseCabinOffer[] | undefined {
  const slug = bookingUrlToSlug(bookingUrl);
  if (!slug) return undefined;
  const rows = offersBySlug.get(slug);
  return rows?.length ? rows : undefined;
}
