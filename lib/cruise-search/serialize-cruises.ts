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
  return offers.map((offer) => ({
    cabinCode: offer.cabinCode,
    cabinName: offer.cabinName,
    cabinCategory: offer.cabinCategory,
    tariffName: offer.tariffName,
    areaM2: offer.areaM2,
    decks: offer.decks,
    price: offer.price,
  }));
}

function serializeDate(date: CruiseDate): CruiseDate | null {
  if (!date.date || !hasCabinPrices(date.cabins)) return null;
  const offers = serializeOffers(date.offers);
  return {
    date: date.date,
    booking_url: date.booking_url,
    cabins: date.cabins,
    ...(offers ? { offers } : {}),
  };
}

export function serializeCruisesForClient(
  cruises: CruiseRecord[]
): CruiseRecord[] {
  return cruises.map((cruise) => {
    const available_dates = (cruise.available_dates || [])
      .map(serializeDate)
      .filter((item): item is CruiseDate => Boolean(item));

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
