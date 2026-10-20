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

export type CruisePickOption = {
  company: string;
  linerSlug: string;
  linerName: string;
  dates: string[];
};

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
      image: HOT_DEAL_COVER_IMAGE,
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
