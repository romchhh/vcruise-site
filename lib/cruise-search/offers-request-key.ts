export type CruiseOffersGuestQuery = {
  adults: number;
  /** Діти 2–11, 4gates `childs`. */
  children: number;
  infants: number;
  /** Діти 12–17, 4gates `childs1`. */
  childrenTeen?: number;
};

/** Disk cache stores the 4gates quote for two adults. Other parties are fetched live. */
export const CRUISE_OFFERS_REFERENCE_GUESTS: CruiseOffersGuestQuery = {
  adults: 2,
  children: 0,
  infants: 0,
};

/** 4gates get_cabins uses adults + child buckets only (infants are not sent). */
export function normalizeOffersGuests(guests: CruiseOffersGuestQuery) {
  return {
    adults: Math.max(1, Math.round(guests.adults)),
    children: Math.max(0, Math.round(guests.children)),
    childrenTeen: Math.max(0, Math.round(guests.childrenTeen ?? 0)),
  };
}

export function isReferenceOffersParty(guests: CruiseOffersGuestQuery) {
  const normalized = normalizeOffersGuests(guests);
  return (
    normalized.adults === CRUISE_OFFERS_REFERENCE_GUESTS.adults &&
    normalized.children === CRUISE_OFFERS_REFERENCE_GUESTS.children &&
    normalized.childrenTeen === 0
  );
}

export function offersRequestKey(
  bookingUrl: string,
  guests: CruiseOffersGuestQuery = CRUISE_OFFERS_REFERENCE_GUESTS,
) {
  const normalized = normalizeOffersGuests(guests);
  return `${bookingUrl.trim()}|${normalized.adults}|${normalized.children}|${normalized.childrenTeen}`;
}

export function cabinPlacementLabel(
  adults: number,
  children = 0,
  infants = 0,
  childrenTeen = 0,
) {
  const plural = (count: number, one: string, few: string, many: string) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };

  const parts = [
    `${adults} ${plural(adults, "дорослого", "дорослих", "дорослих")}`,
  ];
  if (children > 0) {
    parts.push(
      `${children} ${plural(children, "дитину 2–11", "дитини 2–11", "дітей 2–11")}`,
    );
  }
  if (childrenTeen > 0) {
    parts.push(
      `${childrenTeen} ${plural(childrenTeen, "дитину 12–17", "дитини 12–17", "дітей 12–17")}`,
    );
  }
  if (infants > 0) {
    parts.push(
      `${infants} ${plural(infants, "немовля", "немовлят", "немовлят")}`,
    );
  }
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} і ${parts[parts.length - 1]}`;
}
