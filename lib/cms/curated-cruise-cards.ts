import { buildSearchParams } from "@/lib/cruise-search/params";
import { cheapestPrice } from "@/lib/cruise-search/utils";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import {
  HOT_DEAL_COVER_IMAGE,
  HOT_DEAL_DISCOUNT_PERCENT,
  SECTION_CARD_LIMIT,
  UNIQUE_ROUTE_COVER_IMAGE,
  type CruisePickOption,
} from "@/lib/cms/section-card-shared";
import { cardsToHotDeals, cardsToUniqueRoutes } from "@/lib/cms/section-items";
import type { ContentBlock, ContentBlockCard } from "@/lib/cms/store";
import type { HotDeal, PriceBasis, UniqueRoute } from "@/types";

function parsePriceBasis(value: unknown): PriceBasis {
  return value === "couple" ? "couple" : "person";
}

function applyPriceBasis(price: number, _basis: PriceBasis) {
  return price;
}

/** Deep-link to one sailing and open booking modal on /search. */
function cruiseDeepLink(input: {
  cruise: CruiseRecord;
  date: string;
  sort: "price_asc" | "date_asc";
}) {
  const { cruise, date, sort } = input;
  const region = cruise.region_name || "Середземномор'я";
  const query = buildSearchParams({
    regions: [region],
    company: cruise.cruise_title,
    liner: cruise.liner_slug,
    dateFrom: date,
    dateTo: date,
    sort,
    currency: "USD",
    newLinersOnly: false,
  });
  return `/search?${query}&cruise=${cruise.key}`;
}

export {
  SECTION_CARD_LIMIT,
  emptyCruiseCard,
  curatedCardFromPick,
} from "@/lib/cms/section-card-shared";
export type { CruisePickOption } from "@/lib/cms/section-card-shared";

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateShort(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year.slice(2)}`;
}

function formatDateRange(startIso: string, nights: number) {
  const endIso = addDays(startIso, nights);
  return `${formatDateShort(startIso)} – ${formatDateShort(endIso)}`;
}

function routePorts(route: string[]) {
  return route
    .map((port) => port.split(",")[0]?.trim())
    .filter(
      (port) =>
        port &&
        port !== "В морі" &&
        !port.startsWith("...") &&
        !port.startsWith("…"),
    );
}

function formatRoute(route: string[]) {
  const ports = routePorts(route);
  if (!ports.length) return "—";
  if (ports.length === 1) return ports[0];
  return `${ports[0]} → ${ports[ports.length - 1]}`;
}

function formatPortSpan(route: string[]) {
  const ports = routePorts(route);
  if (ports.length >= 2) return `${ports[0]} — ${ports[ports.length - 1]}`;
  if (ports.length === 1) return ports[0]!;
  return "";
}

/** Hot deals keep «Класичний круїз»; unique routes use ports only (override via CMS title). */
function formatTitle(
  route: string[],
  kind: "hot-deals" | "unique-routes" = "hot-deals",
) {
  const span = formatPortSpan(route);
  if (kind === "unique-routes") return span || "Круїз";
  return span ? `Класичний круїз: ${span}` : "Класичний круїз";
}

function resolveCardTitle(
  card: ContentBlockCard,
  route: string[],
  kind: "hot-deals" | "unique-routes",
) {
  const custom = asString(card.title).trim();
  if (custom) return custom;
  return formatTitle(route, kind);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function originalPriceFromDeal(price: number, discountPercent: number) {
  const factor = 1 - discountPercent / 100;
  if (factor <= 0) return price;
  return Math.round(price / factor);
}

function priceOnDate(cruise: CruiseRecord, date: string) {
  const entry = (cruise.available_dates ?? []).find((item) => item.date === date);
  if (entry?.cabins) {
    const fromCabins =
      cheapestPrice({ ...cruise, from_price: entry.cabins }, "USD") ??
      cheapestPrice({ ...cruise, from_price: entry.cabins }, "EUR") ??
      cheapestPrice({ ...cruise, from_price: entry.cabins }, "NAT");
    if (fromCabins != null) return fromCabins;
  }

  return (
    cheapestPrice(cruise, "USD") ??
    cheapestPrice(cruise, "EUR") ??
    cheapestPrice(cruise, "NAT")
  );
}

/** Find cruise matching company + liner + sailing date. */
export function findCruisePick(
  cruises: CruiseRecord[],
  company: string,
  liner: string,
  date: string,
): { cruise: CruiseRecord; date: string; price: number } | null {
  if (!company || !liner || !date) return null;

  const cruise = cruises.find(
    (item) =>
      item.cruise_title === company &&
      item.liner_slug === liner &&
      (item.available_dates ?? []).some((entry) => entry.date === date),
  );

  if (!cruise) return null;
  const price = priceOnDate(cruise, date);
  if (price == null) return null;
  return { cruise, date, price };
}

export function cardToHotDeal(
  card: ContentBlockCard,
  cruises: CruiseRecord[],
): HotDeal | null {
  const company = asString(card.company);
  const liner = asString(card.liner);
  const date = asString(card.date);
  const found = findCruisePick(cruises, company, liner, date);
  if (!found) return null;

  const { cruise, price } = found;
  const nights = Math.max(cruise.nights, 1);
  const route = cruise.route ?? [];
  const discountPercent = asNumber(
    card.discountPercent,
    HOT_DEAL_DISCOUNT_PERCENT,
  );
  const priceBasis = parsePriceBasis(card.priceBasis);
  const displayPrice = applyPriceBasis(price, priceBasis);
  const originalPrice = applyPriceBasis(
    originalPriceFromDeal(price, discountPercent),
    priceBasis,
  );

  return {
    id: asString(card.id) || String(cruise.key),
    company: cruise.cruise_title,
    linerName: cruise.liner_name || cruise.liner_slug,
    title: resolveCardTitle(card, route, "hot-deals"),
    route: formatRoute(route),
    dateRange: formatDateRange(date, nights),
    nights,
    price: displayPrice,
    originalPrice,
    discountPercent,
    priceBasis,
    image: (() => {
      const override = asString(card.image);
      if (override && override !== HOT_DEAL_COVER_IMAGE) return override;
      const logo = cruise.liner_logo?.trim();
      if (logo && (logo.startsWith("http") || logo.startsWith("/"))) return logo;
      return override || HOT_DEAL_COVER_IMAGE;
    })(),
    href: cruiseDeepLink({ cruise, date, sort: "price_asc" }),
  };
}

export function cardToUniqueRoute(
  card: ContentBlockCard,
  cruises: CruiseRecord[],
): UniqueRoute | null {
  const company = asString(card.company);
  const liner = asString(card.liner);
  const date = asString(card.date);
  const found = findCruisePick(cruises, company, liner, date);
  if (!found) return null;

  const { cruise, price } = found;
  const nights = Math.max(cruise.nights, 1);
  const route = cruise.route ?? [];
  const region = cruise.region_name || "Середземномор'я";
  const logo = cruise.liner_logo?.trim();
  const linerImage =
    asString(card.linerImage) ||
    (logo && (logo.startsWith("http") || logo.startsWith("/")) ? logo : "");
  const priceBasis = parsePriceBasis(card.priceBasis);

  return {
    id: asString(card.id) || String(cruise.key),
    region,
    line: cruise.cruise_title,
    linerName: cruise.liner_name || cruise.liner_slug,
    title: resolveCardTitle(card, route, "unique-routes"),
    route: formatRoute(route),
    dateRange: formatDateRange(date, nights),
    nights,
    price: applyPriceBasis(price, priceBasis),
    priceBasis,
    coverImage:
      asString(card.coverImage) ||
      asString(card.image) ||
      UNIQUE_ROUTE_COVER_IMAGE,
    linerImage: linerImage || null,
    href: cruiseDeepLink({ cruise, date, sort: "date_asc" }),
  };
}

export function resolveCuratedHotDeals(
  cards: ContentBlockCard[],
  cruises: CruiseRecord[],
): HotDeal[] {
  return cards
    .slice(0, SECTION_CARD_LIMIT)
    .map((card) => cardToHotDeal(card, cruises))
    .filter((item): item is HotDeal => item !== null);
}

export function resolveCuratedUniqueRoutes(
  cards: ContentBlockCard[],
  cruises: CruiseRecord[],
): UniqueRoute[] {
  return cards
    .slice(0, SECTION_CARD_LIMIT)
    .map((card) => cardToUniqueRoute(card, cruises))
    .filter((item): item is UniqueRoute => item !== null);
}

export function resolveHotDeals(
  block: ContentBlock | undefined,
  fallback: HotDeal[],
  cruises: CruiseRecord[] = [],
): HotDeal[] {
  if (!block?.items?.length) return fallback;
  const curated = resolveCuratedHotDeals(block.items, cruises);
  if (curated.length) return curated;
  const legacy = cardsToHotDeals(block.items);
  return legacy.length ? legacy : fallback;
}

export function resolveUniqueRoutes(
  block: ContentBlock | undefined,
  fallback: UniqueRoute[],
  cruises: CruiseRecord[] = [],
): UniqueRoute[] {
  if (!block?.items?.length) return fallback;
  const curated = resolveCuratedUniqueRoutes(block.items, cruises);
  if (curated.length) return curated;
  const legacy = cardsToUniqueRoutes(block.items);
  return legacy.length ? legacy : fallback;
}

export function buildCruisePickOptions(
  cruises: CruiseRecord[],
  today = new Date().toISOString().slice(0, 10),
): CruisePickOption[] {
  const map = new Map<string, CruisePickOption>();

  for (const cruise of cruises) {
    if (!cruise.cruise_title || !cruise.liner_slug) continue;
    const dates = (cruise.available_dates ?? [])
      .map((item) => item.date)
      .filter((date): date is string => Boolean(date && date >= today))
      .sort();
    if (!dates.length) continue;

    const key = `${cruise.cruise_title}::${cruise.liner_slug}`;
    const existing = map.get(key);
    if (existing) {
      existing.dates = Array.from(
        new Set([...existing.dates, ...dates]),
      ).sort();
      continue;
    }

    map.set(key, {
      company: cruise.cruise_title,
      linerSlug: cruise.liner_slug,
      linerName: cruise.liner_name || cruise.liner_slug,
      dates,
    });
  }

  return [...map.values()].sort(
    (a, b) =>
      a.company.localeCompare(b.company, "uk") ||
      a.linerName.localeCompare(b.linerName, "uk"),
  );
}
