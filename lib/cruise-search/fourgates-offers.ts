import { normalizeTariffName } from "./offer-key";
import type { CruiseCabinOffer, CurrencyCode } from "./types";

const BASE = "https://4gates.cruises";
const AJAX = `${BASE}/search/ajax.php`;
const SEARCH_PAGE = `${BASE}/ua/search/`;

const CATEGORY_BY_TAB: Record<string, CruiseCabinOffer["cabinCategory"]> = {
  INTERIO: "Внутрішня",
  SWINDOWS: "З вікном",
  SBALCON: "З балконом",
  SWITS: "Сьют",
  SWITS_AUREA: "Сьют",
  SWITS_YC: "Сьют",
};

export type FourgatesGuestParams = {
  adults: number;
  /** 2–11 років на 4gates */
  childrenYoung: number;
  /** 12–17 років на 4gates */
  childrenTeen: number;
};

type CacheEntry = {
  expiresAt: number;
  offers: CruiseCabinOffer[];
};

const offerCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CruiseCabinOffer[]>>();
const CACHE_TTL_MS = 15 * 60 * 1000;

let sessionCookie: { value: string; expiresAt: number } | null = null;
const SESSION_TTL_MS = 25 * 60 * 1000;

function cacheKey(slug: string, guests: FourgatesGuestParams) {
  return `${slug}:${guests.adults}:${guests.childrenYoung}:${guests.childrenTeen}`;
}

export function bookingUrlToSlug(bookingUrl: string): string | null {
  const trimmed = bookingUrl.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, `${BASE}/ua/search/`);
    if (url.hostname !== "4gates.cruises") return null;
    const slug = url.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!/^cruise-.+\.html$/i.test(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

export function isAllowedBookingUrl(bookingUrl: string) {
  return Boolean(bookingUrlToSlug(bookingUrl));
}

/** Map our modal guests (2–17 as one bucket) onto 4gates counters. */
export function mapGuestsToFourgates(
  adults: number,
  children: number,
  infants = 0,
): FourgatesGuestParams {
  void infants;
  const aduls = Math.max(1, Math.round(adults));
  const kids = Math.max(0, Math.round(children));
  return {
    adults: aduls,
    childrenYoung: kids,
    childrenTeen: 0,
  };
}

function parseMoney(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function parseCabinMeta(name: string) {
  const deckMatch = name.match(/\(пал:\s*([^)]+)\)/i);
  let areaM2: number | undefined;
  const areaMatch = name.match(/(\d+(?:[.,]\d+)?)\s*м\s*2/i);
  if (areaMatch && !/\+\s*\d+\s*м\s*2/i.test(name)) {
    areaM2 = Number.parseFloat(areaMatch[1].replace(",", "."));
  }
  return {
    areaM2,
    decks: deckMatch?.[1]?.trim(),
  };
}

type ParsedOffer = CruiseCabinOffer & { shipId?: string };

function stripShipId(offers: ParsedOffer[]): CruiseCabinOffer[] {
  return offers.map(({ shipId: _shipId, ...offer }) => offer);
}

function parsePricesFromRow(rowHtml: string): Partial<Record<CurrencyCode, number>> {
  const price: Partial<Record<CurrencyCode, number>> = {};
  const spanRe =
    /<span[^>]*class="[^"]*_?(NAT|USD|EUR)[^"]*"[^>]*>([^<]+)<\/span>/gi;
  let match: RegExpExecArray | null;
  while ((match = spanRe.exec(rowHtml)) !== null) {
    const code = match[1] as CurrencyCode;
    const amount = parseMoney(match[2]);
    if (amount != null) price[code] = amount;
  }
  if (Object.keys(price).length) return price;

  const fallback = rowHtml.match(
    /([\d\s]+)\s*₴|([\d\s]+)\s*\$|([\d\s.,]+)\s*€/,
  );
  if (fallback) {
    const nat = parseMoney(fallback[1] ?? "");
    const usd = parseMoney(fallback[2] ?? "");
    const eur = parseMoney(fallback[3] ?? "");
    if (nat != null) price.NAT = nat;
    if (usd != null) price.USD = usd;
    if (eur != null) price.EUR = eur;
  }
  return price;
}

function looksLikePriceText(text: string) {
  return /₴|€|\$/.test(text);
}

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBookingRows(tabHtml: string): string[] {
  const marker = "booking-table__row";
  const rows: string[] = [];
  let searchFrom = 0;

  while (searchFrom < tabHtml.length) {
    const rowStart = tabHtml.indexOf(marker, searchFrom);
    if (rowStart < 0) break;

    const contentStart = tabHtml.indexOf(">", rowStart);
    if (contentStart < 0) break;

    let depth = 1;
    let index = contentStart + 1;

    while (index < tabHtml.length && depth > 0) {
      const nextOpen = tabHtml.indexOf("<div", index);
      const nextClose = tabHtml.indexOf("</div>", index);
      if (nextClose < 0) break;

      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        index = nextOpen + 4;
        continue;
      }

      depth -= 1;
      index = nextClose + "</div>".length;
    }

    if (depth === 0) {
      rows.push(tabHtml.slice(contentStart + 1, index - "</div>".length));
    }

    searchFrom = index;
  }

  return rows;
}

function parseRowHtml(
  rowHtml: string,
  category: CruiseCabinOffer["cabinCategory"],
): ParsedOffer | null {
  const cells: string[] = [];
  const cellRe = /<div[^>]*>([\s\S]*?)<\/div>/gi;
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
    const inner = cellMatch[1];
    if (inner.includes('class="_prices"') || inner.includes("booking-table")) {
      continue;
    }
    const text = stripTags(inner);
    if (!text || text === "Вибрати" || looksLikePriceText(text)) continue;
    cells.push(text);
    if (cells.length >= 4) break;
  }

  if (cells.length < 2) return null;

  const cabinCode = cells[0];
  const cabinName = cells[1];
  const tariffName = normalizeTariffName(cells[2] ?? "");
  const price = parsePricesFromRow(rowHtml);
  if (!Object.keys(price).length) return null;

  const meta = parseCabinMeta(cabinName);
  const shipId = rowHtml.match(/ship_id=["'](\d+)["']/i)?.[1];

  return {
    cabinCode,
    cabinName,
    cabinCategory: category,
    tariffName,
    areaM2: meta.areaM2,
    decks: meta.decks,
    price,
    shipId,
  };
}

export function parseCabinsHtml(cabinsHtml: string): ParsedOffer[] {
  if (!cabinsHtml || cabinsHtml.includes("notify")) {
    return [];
  }

  const tabKeys = [
    ...cabinsHtml.matchAll(/id=["']tab-([^"']+)["']/g),
  ].map((match) => match[1]);

  const offers: ParsedOffer[] = [];

  for (let i = 0; i < tabKeys.length; i += 1) {
    const tabKey = tabKeys[i];
    const category = CATEGORY_BY_TAB[tabKey];
    if (!category) continue;

    const start = cabinsHtml.indexOf(`id="tab-${tabKey}"`);
    if (start < 0) continue;

    const nextStarts = tabKeys
      .slice(i + 1)
      .map((key) => cabinsHtml.indexOf(`id="tab-${key}"`, start + 1))
      .filter((pos) => pos > start);
    const end = nextStarts.length ? Math.min(...nextStarts) : cabinsHtml.length;
    const tabHtml = cabinsHtml.slice(start, end);

    for (const rowHtml of extractBookingRows(tabHtml)) {
      const parsed = parseRowHtml(rowHtml, category);
      if (parsed) offers.push(parsed);
    }
  }

  return offers;
}

async function warmSession(): Promise<string> {
  const res = await fetch(SEARCH_PAGE, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VcruiseBot/1.0; +https://vcruise.ua)",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  const cookie = res.headers.getSetCookie?.() ?? [];
  const joined = cookie.map((c) => c.split(";")[0]).join("; ");
  return joined;
}

let sessionWarmInFlight: Promise<string> | null = null;

async function getSessionCookie(): Promise<string> {
  if (sessionCookie && sessionCookie.expiresAt > Date.now()) {
    return sessionCookie.value;
  }
  if (sessionWarmInFlight) {
    return sessionWarmInFlight;
  }
  sessionWarmInFlight = warmSession()
    .then((value) => {
      sessionCookie = {
        value,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      return value;
    })
    .finally(() => {
      sessionWarmInFlight = null;
    });
  return sessionWarmInFlight;
}

async function loadOffersFromFourgates(
  bookingUrl: string,
  guests: FourgatesGuestParams,
): Promise<CruiseCabinOffer[]> {
  const slug = bookingUrlToSlug(bookingUrl);
  if (!slug) {
    throw new Error("Некоректне посилання на круїз.");
  }

  const referer = bookingUrl.startsWith("http")
    ? bookingUrl
    : `${BASE}/ua/search/${slug}`;

  const params = new URLSearchParams({
    act: "get_cabins",
    urls: slug,
    locale: "ua",
    aduls: String(guests.adults),
    childs: String(guests.childrenYoung),
    childs1: String(guests.childrenTeen),
  });

  // The public widget calls get_cabins with credentials omitted.
  // A shared PHPSESSID serializes these requests (PHP session lock), so a
  // second sailing waits out the first and a ~7s quote becomes ~20s.
  const res = await fetch(`${AJAX}?${params.toString()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: referer,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`4gates повернув ${res.status}`);
  }

  const data = (await res.json()) as { cabins?: string };
  return stripShipId(parseCabinsHtml(data.cabins ?? ""));
}

export async function warmFourgatesSession(): Promise<void> {
  await getSessionCookie();
}

export async function fetchFourgatesOffers(
  bookingUrl: string,
  guests: FourgatesGuestParams,
): Promise<CruiseCabinOffer[]> {
  const slug = bookingUrlToSlug(bookingUrl);
  if (!slug) {
    throw new Error("Некоректне посилання на круїз.");
  }

  const key = cacheKey(slug, guests);
  const cached = offerCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.offers;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = loadOffersFromFourgates(bookingUrl, guests)
    .then((offers) => {
      offerCache.set(key, {
        offers,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return offers;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
