import type { CruiseDate, CruiseRecord } from "./types";

function serializeDate(date: CruiseDate): CruiseDate {
  return {
    date: date.date,
    booking_url: date.booking_url,
    cabins: date.cabins,
  };
}

export function serializeCruisesForClient(
  cruises: CruiseRecord[]
): CruiseRecord[] {
  return cruises.map((cruise) => ({
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
    base_date_start: cruise.base_date_start,
    from_price: cruise.from_price,
    available_dates: cruise.available_dates?.map(serializeDate),
  }));
}
