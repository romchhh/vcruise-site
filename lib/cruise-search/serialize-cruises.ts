import { offersForBookingUrl } from "./load-offers-cache";
import { normalizeCruiseCabinOffer } from "./offer-key";
import { ownCruiseBookingUrl } from "./utils";
import type {
  CabinPriceMap,
  CruiseCabinOffer,
  CruiseDate,
  CruiseRecord,
} from "./types";

function hasCabinPrices(cabins?: CabinPriceMap) {
  if (!cabins) return false;
  return Object.values(cabins).some(
    (prices) =>
      prices &&
      Object.values(prices).some(
        (value) => typeof value === "number" && Number.isFinite(value)
      )
  );
}

function serializeOffers(
  offers: CruiseCabinOffer[] | undefined
): CruiseCabinOffer[] | undefined {
  if (!offers?.length) return undefined;
  return offers.map((offer) => {
    const normalized = normalizeCruiseCabinOffer(offer);
    return {
      cabinCode: normalized.cabinCode,
      cabinName: normalized.cabinName,
      cabinCategory: normalized.cabinCategory,
      tariffName: normalized.tariffName,
      areaM2: normalized.areaM2,
      decks: normalized.decks,
      price: normalized.price,
    };
  });
}

function serializeDate(
  date: CruiseDate,
  offersBySlug: ReadonlyMap<string, CruiseCabinOffer[]>,
  includeOffers: boolean,
): CruiseDate | null {
  if (!date.date || !hasCabinPrices(date.cabins)) return null;
  const fromFile =
    includeOffers && date.booking_url
      ? offersForBookingUrl(date.booking_url, offersBySlug)
      : undefined;
  const offers = includeOffers
    ? serializeOffers(fromFile ?? date.offers)
    : undefined;
  return {
    date: date.date,
    booking_url: date.booking_url,
    cabins: date.cabins,
    ...(offers ? { offers } : {}),
  };
}

export function serializeCruisesForClient(
  cruises: CruiseRecord[],
  offersBySlug = new Map<string, CruiseCabinOffer[]>(),
  options?: { includeOffers?: boolean },
): CruiseRecord[] {
  const includeOffers = options?.includeOffers !== false;
  return cruises.map((cruise) => {
    const ownDate = cruise.base_date_start;
    const ownEntry = ownDate
      ? serializeDate(
          {
            date: ownDate,
            booking_url: ownCruiseBookingUrl(cruise) || undefined,
            cabins: cruise.from_price,
          },
          offersBySlug,
          includeOffers,
        )
      : null;
    const available_dates = ownEntry ? [ownEntry] : [];

    return {
      key: cruise.key,
      cruise_id: cruise.cruise_id,
      cruise_title: cruise.cruise_title,
      liner_slug: cruise.liner_slug,
      liner_name: cruise.liner_name,
      liner_logo: cruise.liner_logo,
      region_name: cruise.region_name,
      region_id: cruise.region_id,
      route: cruise.route,
      nights: cruise.nights,
      nights_str: cruise.nights_str,
      ship_built_year: cruise.ship_built_year,
      ship_renovated_year: cruise.ship_renovated_year,
      ship_class: cruise.ship_class,
      company_class: cruise.company_class,
      ship_size: cruise.ship_size,
      star_rating: cruise.star_rating,
      review_score: cruise.review_score,
      review_count: cruise.review_count,
      base_date_start: cruise.base_date_start,
      from_price: cruise.from_price,
      available_dates,
    };
  });
}
