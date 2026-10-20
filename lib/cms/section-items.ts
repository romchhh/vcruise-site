import { destinations } from "@/data/destinations";
import { linerClasses } from "@/data/liner-classes";
import { packageTours } from "@/data/tours";
import type { ContentBlock, ContentBlockCard, ContentBlockKey } from "@/lib/cms/store";
import type {
  Destination,
  HotDeal,
  LinerClass,
  PackageTour,
  UniqueRoute,
} from "@/types";

/** Sections whose homepage cards are curated in CMS. */
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

/** Static defaults for curated (non-cruise) sections. */
export function defaultCardsFor(key: ContentBlockKey): ContentBlockCard[] {
  switch (key) {
    case "destinations":
      return destinations.map((item) => ({ ...item }));
    case "liner-classes":
      return linerClasses.map((item) => ({ ...item }));
    case "package-tours":
      return packageTours.map((item) => ({ ...item }));
    default:
      return [];
  }
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function cardsToHotDeals(cards: ContentBlockCard[]): HotDeal[] {
  return cards.map((card, index) => ({
    id: asString(card.id, `deal-${index + 1}`),
    title: asString(card.title, "Круїз"),
    route: asString(card.route, "—"),
    dateRange: asString(card.dateRange, "—"),
    nights: asNumber(card.nights, 7),
    price: asNumber(card.price, 0),
    originalPrice: asNumber(card.originalPrice, asNumber(card.price, 0)),
    discountPercent: asNumber(card.discountPercent, 25),
    image: asString(card.image || card.coverImage, "/images/sections/hot-deals-cover.jpg"),
    href: asString(card.href, "/search"),
  }));
}

export function cardsToUniqueRoutes(cards: ContentBlockCard[]): UniqueRoute[] {
  return cards.map((card, index) => {
    const linerRaw = card.linerImage;
    const linerImage =
      typeof linerRaw === "string" && linerRaw.trim() ? linerRaw.trim() : null;
    return {
      id: asString(card.id, `route-${index + 1}`),
      region: asString(card.region, ""),
      line: asString(card.line, ""),
      title: asString(card.title, "Круїз"),
      route: asString(card.route, "—"),
      dateRange: asString(card.dateRange, "—"),
      nights: asNumber(card.nights, 7),
      price: asNumber(card.price, 0),
      coverImage: asString(
        card.coverImage || card.image,
        "/images/sections/unique-routes-cover.jpg",
      ),
      linerImage,
      href: asString(card.href, "/search"),
    };
  });
}

export function cardsToDestinations(cards: ContentBlockCard[]): Destination[] {
  return cards.map((card, index) => {
    const about = Array.isArray(card.about)
      ? asStringArray(card.about)
      : asString(card.about)
        ? [asString(card.about)]
        : [];
    return {
      id: asString(card.id, `destination-${index + 1}`),
      title: asString(card.title, "Напрямок"),
      subtitle: asString(card.subtitle, ""),
      description: asString(card.description, ""),
      image: asString(card.image, ""),
      gallery: asStringArray(card.gallery ?? card.images),
      about,
      seasonality: asString(card.seasonality, ""),
      temperature: asString(card.temperature, ""),
      searchLabel: asString(card.searchLabel, asString(card.title)),
    };
  });
}

export function cardsToLinerClasses(cards: ContentBlockCard[]): LinerClass[] {
  return cards.map((card, index) => {
    const ships = Array.isArray(card.ships)
      ? card.ships
          .map((ship) => {
            if (!ship || typeof ship !== "object") return null;
            const entry = ship as Record<string, unknown>;
            const name = asString(entry.name);
            if (!name) return null;
            return {
              name,
              ...(asString(entry.linerSlug)
                ? { linerSlug: asString(entry.linerSlug) }
                : {}),
              ...(asString(entry.company)
                ? { company: asString(entry.company) }
                : {}),
            };
          })
          .filter((ship): ship is NonNullable<typeof ship> => ship !== null)
      : [];

    const logos = Array.isArray(card.logos)
      ? card.logos
          .map((logo) => {
            if (!logo || typeof logo !== "object") return null;
            const entry = logo as Record<string, unknown>;
            const src = asString(entry.src);
            if (!src) return null;
            return { src, alt: asString(entry.alt, "") };
          })
          .filter((logo): logo is NonNullable<typeof logo> => logo !== null)
      : [];

    return {
      id: asString(card.id, `liner-class-${index + 1}`),
      title: asString(card.title, "Клас"),
      ships,
      image: asString(card.image, ""),
      modalHeadline: asString(card.modalHeadline, ""),
      modalDescription: asStringArray(card.modalDescription),
      popularLiners: asStringArray(card.popularLiners),
      gallery: asStringArray(card.gallery ?? card.images),
      logos,
    };
  });
}

export function cardsToPackageTours(cards: ContentBlockCard[]): PackageTour[] {
  return cards.map((card, index) => ({
    id: asString(card.id, `tour-${index + 1}`),
    region: asString(card.region, ""),
    city: asString(card.city, ""),
    hotel: asString(card.hotel || card.title, ""),
    rating: asNumber(card.rating, 5),
    reviewScore: asNumber(card.reviewScore, 9),
    reviewCount: asNumber(card.reviewCount, 0),
    reviewLabel: asString(card.reviewLabel, ""),
    dateRange: asString(card.dateRange, ""),
    nights: asNumber(card.nights, 7),
    meals: asString(card.meals, ""),
    room: asString(card.room, ""),
    guests: asString(card.guests, ""),
    bed: asString(card.bed, ""),
    price: asNumber(card.price, 0),
    image: asString(card.image, ""),
    gallery: asStringArray(card.gallery ?? card.images),
    about: asString(card.about, ""),
    amenities: asStringArray(card.amenities),
    included: asStringArray(card.included),
  }));
}

export function resolveHotDeals(
  block: ContentBlock | undefined,
  fallback: HotDeal[],
): HotDeal[] {
  if (block?.items?.length) return cardsToHotDeals(block.items);
  return fallback;
}

export function resolveUniqueRoutes(
  block: ContentBlock | undefined,
  fallback: UniqueRoute[],
): UniqueRoute[] {
  if (block?.items?.length) return cardsToUniqueRoutes(block.items);
  return fallback;
}

export function resolveDestinations(block?: ContentBlock | null): Destination[] {
  if (block?.items?.length) return cardsToDestinations(block.items);
  return destinations;
}

export function resolveLinerClasses(block?: ContentBlock | null): LinerClass[] {
  if (block?.items?.length) return cardsToLinerClasses(block.items);
  return linerClasses;
}

export function resolvePackageTours(block?: ContentBlock | null): PackageTour[] {
  if (block?.items?.length) return cardsToPackageTours(block.items);
  return packageTours;
}

export function emptyCardFor(key: ContentBlockKey): ContentBlockCard {
  const id = `card-${Date.now().toString(36)}`;
  switch (key) {
    case "hot-deals":
      return {
        id,
        title: "Нова пропозиція",
        route: "",
        dateRange: "",
        nights: 7,
        price: 0,
        originalPrice: 0,
        discountPercent: 25,
        image: "/images/sections/hot-deals-cover.jpg",
        href: "/search",
      };
    case "unique-routes":
      return {
        id,
        region: "",
        line: "",
        title: "Новий маршрут",
        route: "",
        dateRange: "",
        nights: 7,
        price: 0,
        coverImage: "/images/sections/unique-routes-cover.jpg",
        linerImage: "",
        href: "/search",
      };
    case "destinations":
      return {
        id,
        title: "Новий напрямок",
        subtitle: "",
        description: "",
        image: "",
        gallery: [],
        about: [],
        seasonality: "",
        temperature: "",
        searchLabel: "",
      };
    case "liner-classes":
      return {
        id,
        title: "Новий клас",
        ships: [],
        image: "",
        modalHeadline: "",
        modalDescription: [],
        popularLiners: [],
        gallery: [],
        logos: [],
      };
    case "package-tours":
      return {
        id,
        region: "",
        city: "",
        hotel: "Новий тур",
        rating: 5,
        reviewScore: 9,
        reviewCount: 0,
        reviewLabel: "Чудово",
        dateRange: "",
        nights: 7,
        meals: "",
        room: "",
        guests: "2 дорослих",
        bed: "",
        price: 0,
        image: "",
        gallery: [],
        about: "",
        amenities: [],
        included: [],
      };
    default:
      return { id, title: "Нова картка" };
  }
}
