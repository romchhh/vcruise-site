import { buildSearchParams } from "@/lib/cruise-search/params";
import { HOT_DEAL_DISCOUNT_PERCENT } from "@/lib/cruise-search/hot-deals";
import { UNIQUE_ROUTE_COVER_IMAGE } from "@/lib/cruise-search/unique-routes";
import { cheapestPrice } from "@/lib/cruise-search/utils";
import type { CruiseRecord } from "@/lib/cruise-search/types";
import type { ContentBlockCard } from "@/lib/cms/store";
import type { HotDeal, UniqueRoute } from "@/types";

export const SECTION_CARD_LIMIT = 6;

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

function formatTitle(route: string[]) {
  const ports = routePorts(route);
  if (ports.length >= 2) {
    return `Класичний круїз: ${ports[0]} — ${ports[ports.length - 1]}`;
  }
  if (ports.length === 1) return `Класичний круїз: ${ports[0]}`;
  return "Класичний круїз";
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
      cheapestPrice(
        { ...cruise, from_price: entry.cabins },
        "USD",
      ) ??
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
  const region = cruise.region_name || "Середземномор'я";

  return {
    id: asString(card.id) || String(cruise.key),
    title: formatTitle(route),
    route: formatRoute(route),
    dateRange: formatDateRange(date, nights),
    nights,
    price,
    originalPrice: originalPriceFromDeal(price, discountPercent),
    discountPercent,
    image:
      asString(card.image) ||
      "/images/sections/hot-deals-cover.jpg",
    href: `/search?${buildSearchParams({
      regions: [region],
      company: cruise.cruise_title,
      liner: cruise.liner_slug,
      dateFrom: date,
      sort: "price_asc",
      currency: "USD",
      newLinersOnly: false,
    })}`,
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

  return {
    id: asString(card.id) || String(cruise.key),
    region,
    line: cruise.cruise_title,
    title: formatTitle(route),
    route: formatRoute(route),
    dateRange: formatDateRange(date, nights),
    nights,
    price,
    coverImage:
      asString(card.coverImage) ||
      asString(card.image) ||
      UNIQUE_ROUTE_COVER_IMAGE,
    linerImage: linerImage || null,
    href: `/search?${buildSearchParams({
      regions: [region],
      company: cruise.cruise_title,
      liner: cruise.liner_slug,
      dateFrom: date,
      sort: "date_asc",
      currency: "USD",
      newLinersOnly: false,
    })}`,
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

/** Compact options for admin cruise picker. */
export type CruisePickOption = {
  company: string;
  linerSlug: string;
  linerName: string;
  dates: string[];
};

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

  return [...map.values()].sort((a, b) =>
    a.company.localeCompare(b.company, "uk") ||
    a.linerName.localeCompare(b.linerName, "uk"),
  );
}

export function emptyCruiseCard(
  kind: "hot-deals" | "unique-routes",
): ContentBlockCard {
  const id = `card-${Date.now().toString(36)}`;
  if (kind === "hot-deals") {
    return {
      id,
      company: "",
      liner: "",
      date: "",
      discountPercent: HOT_DEAL_DISCOUNT_PERCENT,
      image: "/images/sections/hot-deals-cover.jpg",
    };
  }
  return {
    id,
    company: "",
    liner: "",
    date: "",
    coverImage: UNIQUE_ROUTE_COVER_IMAGE,
    linerImage: "",
  };
}

export function curatedCardFromPick(
  kind: "hot-deals" | "unique-routes",
  pick: { company: string; liner: string; date: string; id?: string },
): ContentBlockCard {
  const base = emptyCruiseCard(kind);
  return {
    ...base,
    id: pick.id || base.id,
    company: pick.company,
    liner: pick.liner,
    date: pick.date,
  };
}
