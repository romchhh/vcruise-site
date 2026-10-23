import type { CruiseCabinOffer } from "./types";

/** Short cabin line without duplicated category / deck suffix. */
export function offerCabinSubtitle(offer: CruiseCabinOffer) {
  let name = offer.cabinName.trim();
  name = name.replace(/\s*\(пал:\s*[^)]+\)\s*$/i, "").trim();
  if (name.includes("›")) {
    const tail = name.split("›").pop()?.trim();
    if (tail) name = tail;
  }
  if (/^внутрішня$/i.test(name) && offer.cabinCategory === "Внутрішня") {
    return offer.cabinName.replace(/\s*\(пал:[^)]+\)\s*$/i, "").trim();
  }
  return name || offer.cabinName;
}

/** m² and decks on one line; skip deck if already in cabinName. */
export function offerMetaLine(offer: CruiseCabinOffer) {
  const parts: string[] = [];
  if (offer.areaM2 != null && Number.isFinite(offer.areaM2)) {
    parts.push(`${offer.areaM2} м²`);
  } else {
    const inlineArea = offer.cabinName.match(
      /(\d+(?:\s*-\s*\d+)?(?:\s*\+\s*\d+)?)\s*м\s*2/i,
    );
    if (inlineArea) {
      parts.push(`${inlineArea[1].replace(/\s+/g, "")} м²`);
    }
  }

  const deckInName = offer.cabinName.match(/\(пал:\s*([^)]+)\)/i)?.[1]?.trim();
  const decks = offer.decks?.trim();
  if (decks && deckInName !== decks) {
    parts.push(`пал: ${decks}`);
  }

  return parts.join(" · ");
}
