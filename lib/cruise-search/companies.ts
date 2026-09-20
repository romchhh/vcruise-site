export const FEATURED_CRUISE_COMPANIES = [
  "MSC Cruises",
  "Costa Cruises",
  "Disney Cruise Line",
  "Norwegian Cruise Line",
  "Royal Caribbean International",
  "Celebrity Cruises",
  "Oceania Cruises",
  "Princess Cruises",
  "Virgin Voyages",
  "SilverSea Cruises",
  "Viking Cruises",
  "Regent Seven Seas Cruises",
  "Explora Journeys",
  "Cunard Line",
  "Crystal Cruises",
  "Ritz-Carlton Yacht Collection",
  "Seabourn Cruises",
  "Ponant Cruises",
  "Four Seasons Yachts",
  "Swan Hellenic Cruises",
] as const;

const featuredCompanySet = new Set<string>(FEATURED_CRUISE_COMPANIES);

export function isFeaturedCompany(title: string) {
  return featuredCompanySet.has(title);
}
