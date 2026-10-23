export type CurrencyCode = "NAT" | "USD" | "EUR";

export type CabinPrices = Partial<Record<CurrencyCode, number>>;

export type CabinPriceMap = Partial<
  Record<"Внутрішня" | "З вікном" | "З балконом" | "Сьют", CabinPrices>
>;

/**
 * Future import from 4gates cabin page (phase 2 — not populated yet).
 * When scraped: tariff tabs × cabin codes (IR1, m², decks, price).
 */
export type CruiseCabinOffer = {
  cabinCode: string;
  cabinName: string;
  cabinCategory?: "Внутрішня" | "З вікном" | "З балконом" | "Сьют";
  tariffName: string;
  areaM2?: number;
  decks?: string;
  price: CabinPrices;
};

export type CruiseDate = {
  date: string;
  date_raw?: string;
  booking_url?: string;
  cabins?: CabinPriceMap;
  /** Populated after tariff scraper (phase 2). */
  offers?: CruiseCabinOffer[];
};

export type CruiseRecord = {
  key: number;
  cruise_id: string;
  cruise_title: string;
  cruise_logo?: string;
  liner_slug: string;
  liner_name: string;
  ship_id?: string;
  ship_built_year?: number;
  ship_renovated_year?: number;
  ship_class?: string;
  company_class?: string;
  ship_size?: string;
  liner_logo?: string;
  region_name: string;
  region_id: string;
  route: string[];
  visa_countries?: string[];
  port_from_id?: number;
  duration_days?: number;
  duration_days_str?: string;
  nights: number;
  nights_str?: string;
  base_date_start?: string;
  base_date_end?: string;
  from_price?: CabinPriceMap;
  available_dates?: CruiseDate[];
  star_rating?: number;
  review_score?: number | null;
  review_count?: number;
  locale?: string;
};

export type CruiseSort =
  | "date_asc"
  | "date_desc"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "duration_desc";

export type CruiseSearchFilters = {
  regions: string[];
  company: string;
  liner: string;
  year: string;
  months: string[];
  duration: string;
  dateFrom: string;
  dateTo: string;
  durMin: number;
  durMax: number;
  priceMin: number;
  priceMax: number;
  adults: number;
  children: number;
  infants: number;
  sort: CruiseSort;
  currency: CurrencyCode;
  newLinersOnly: boolean;
};
