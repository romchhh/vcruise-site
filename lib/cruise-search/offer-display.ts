import type { CruiseCabinOffer } from "./types";

/** Short cabin line as on 4gates, including deck note. */
export function offerCabinSubtitle(offer: CruiseCabinOffer) {
  let name = offer.cabinName.trim().replace(/\s+/g, " ");
  if (name.includes("›")) {
    const tail = name.split("›").pop()?.trim();
    if (tail) name = tail;
  }
  return name || offer.cabinName;
}

/** Area range from the 4gates name, e.g. «13-21 м²», not only the last number. */
export function offerAreaLabel(offer: CruiseCabinOffer) {
  const range = offer.cabinName.match(
    /(\d+\s*(?:-\s*\d+)?(?:\s*\+\s*\d+)?)\s*м\s*2/i,
  );
  if (range) {
    return `${range[1].replace(/\s+/g, "")} м²`;
  }
  if (offer.areaM2 != null && Number.isFinite(offer.areaM2)) {
    return `${offer.areaM2} м²`;
  }
  return "";
}

/** Extra line only when the cabin name does not already contain area or decks. */
export function offerMetaLine(offer: CruiseCabinOffer) {
  const parts: string[] = [];
  const areaInName = /\d+\s*(?:-\s*\d+)?(?:\s*\+\s*\d+)?\s*м\s*2/i.test(
    offer.cabinName,
  );
  if (!areaInName) {
    const area = offerAreaLabel(offer);
    if (area) parts.push(area);
  }

  const deckInName = offer.cabinName.match(/\(пал:\s*([^)]+)\)/i)?.[1]?.trim();
  const decks = offer.decks?.trim();
  if (decks && !deckInName) {
    parts.push(`пал: ${decks}`);
  }

  return parts.join(" · ");
}
