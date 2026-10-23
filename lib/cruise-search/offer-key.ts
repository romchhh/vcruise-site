import type { CruiseCabinOffer } from "./types";

export function normalizeTariffName(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => (typeof part === "string" ? part : String(part)))
      .join(" ")
      .trim();
  }
  if (value == null) return "";
  return String(value).trim();
}

/** Stable id for selection; price disambiguates duplicate code × tariff rows. */
export function offerKeyOf(offer: CruiseCabinOffer): string {
  const tariff = normalizeTariffName(offer.tariffName);
  const price =
    offer.price?.NAT ?? offer.price?.USD ?? offer.price?.EUR ?? 0;
  const category = offer.cabinCategory ?? "";
  return `${offer.cabinCode}::${tariff}::${price}::${category}`;
}

export function normalizeCruiseCabinOffer(
  offer: CruiseCabinOffer,
): CruiseCabinOffer {
  const tariffName = normalizeTariffName(offer.tariffName);
  if (tariffName === offer.tariffName) return offer;
  return { ...offer, tariffName };
}
