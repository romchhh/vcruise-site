import type { ContentBlockCard, ContentBlockKey } from "@/lib/cms/store";

/** Client-safe constants — do not import cruise loaders here. */
export const SECTION_CARD_LIMIT = 6;
export const HOT_DEAL_DISCOUNT_PERCENT = 25;
export const HOT_DEAL_COVER_IMAGE = "/images/sections/hot-deals-cover.jpg";
export const UNIQUE_ROUTE_COVER_IMAGE =
  "/images/sections/unique-routes-cover.jpg";

export const CARD_SECTION_KEYS: ContentBlockKey[] = [
  "hot-deals",
  "unique-routes",
  "destinations",
  "liner-classes",
  "package-tours",
];

export function isCardSection(key: ContentBlockKey) {
  return CARD_SECTION_KEYS.includes(key);
}

/** One concrete sailing for a company + liner (same date can have several). */
export type CruisePickSailing = {
  key: number;
  date: string;
  nights: number;
  routePreview: string;
};

export type CruisePickOption = {
  company: string;
  linerSlug: string;
  linerName: string;
  dates: string[];
  sailings: CruisePickSailing[];
};

/**
 * Extract cruise key from own-site URL or bare id.
 * Supports `/search/cruise/4175`, `?cruise=4175`, full https://vcruise.com.ua/…
 */
export function parseSiteCruiseKey(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  if (/^\d{1,12}$/.test(text)) {
    const key = Number(text);
    return key > 0 ? key : null;
  }

  try {
    const url = new URL(text, "https://vcruise.com.ua");
    const pathMatch = url.pathname.match(/\/search\/cruise\/(\d+)/);
    if (pathMatch) {
      const key = Number(pathMatch[1]);
      return key > 0 ? key : null;
    }
    const fromQuery = url.searchParams.get("cruise");
    if (fromQuery && /^\d{1,12}$/.test(fromQuery)) {
      const key = Number(fromQuery);
      return key > 0 ? key : null;
    }
  } catch {
    // fall through to loose match
  }

  const loose =
    text.match(/\/search\/cruise\/(\d+)/)?.[1] ||
    text.match(/[?&#]cruise=(\d+)/)?.[1];
  if (!loose) return null;
  const key = Number(loose);
  return key > 0 ? key : null;
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
      cruiseKey: "",
      title: "",
      discountPercent: HOT_DEAL_DISCOUNT_PERCENT,
      priceBasis: "person",
      image: HOT_DEAL_COVER_IMAGE,
    };
  }
  return {
    id,
    company: "",
    liner: "",
    date: "",
    cruiseKey: "",
    title: "",
    priceBasis: "person",
    coverImage: UNIQUE_ROUTE_COVER_IMAGE,
    linerImage: "",
  };
}

export function curatedCardFromPick(
  kind: "hot-deals" | "unique-routes",
  pick: {
    company: string;
    liner: string;
    date: string;
    id?: string;
    cruiseKey?: number | string;
  },
): ContentBlockCard {
  const base = emptyCruiseCard(kind);
  const cruiseKey =
    pick.cruiseKey != null && String(pick.cruiseKey).trim()
      ? String(pick.cruiseKey)
      : pick.id && /^\d+$/.test(pick.id)
        ? pick.id
        : "";
  return {
    ...base,
    id: pick.id || base.id,
    company: pick.company,
    liner: pick.liner,
    date: pick.date,
    cruiseKey,
  };
}
