import {
  fetchJsonWithRetry,
  normalizeClientFetchError,
} from "./fetch-with-retry";
import {
  CRUISE_OFFERS_REFERENCE_GUESTS,
  offersRequestKey,
  type CruiseOffersGuestQuery,
} from "./offers-request-key";
import { isValidPromoid } from "./promoid";
import type { CruiseCabinOffer } from "./types";

export type { CruiseOffersGuestQuery };

export type CruiseOffersPayload = {
  offers: CruiseCabinOffer[];
  guestSpecific: boolean;
  fetchedAt: number;
  source: "disk" | "live";
  /** Disk row has prices, but cabin numbers need a live promo id. */
  promoPending?: boolean;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CruiseOffersPayload>();
const inflight = new Map<string, Promise<CruiseOffersPayload>>();

function countOfferAreas(offers: CruiseCabinOffer[]) {
  return offers.filter((offer) => offer.areaM2 != null).length;
}

function offersMissingArea(offers: CruiseCabinOffer[]) {
  return offers.some(
    (offer) =>
      offer.areaM2 == null &&
      offer.cabinCode &&
      !/\d+\s*м\s*2/i.test(offer.cabinName),
  );
}

function readCache(key: string): CruiseOffersPayload | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit;
}

export function getCachedCruiseOffers(
  bookingUrl: string,
  guests: CruiseOffersGuestQuery = CRUISE_OFFERS_REFERENCE_GUESTS,
): CruiseOffersPayload | null {
  if (!bookingUrl.trim()) return null;
  return readCache(offersRequestKey(bookingUrl, guests));
}

const PREFETCH_LIMIT = 2;
let activePrefetch = 0;
const prefetchQueue: Array<() => void> = [];

function pumpPrefetch(task: () => void) {
  if (activePrefetch < PREFETCH_LIMIT) {
    activePrefetch += 1;
    task();
    return;
  }
  prefetchQueue.push(task);
}

function finishPrefetch() {
  activePrefetch = Math.max(0, activePrefetch - 1);
  const next = prefetchQueue.shift();
  if (!next) return;
  activePrefetch += 1;
  next();
}

export function prefetchCruiseOffers(bookingUrl: string) {
  if (!bookingUrl.trim()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    pumpPrefetch(() => {
      fetchCruiseOffers({ bookingUrl })
        .catch(() => {
          // Prefetch is best-effort.
        })
        .finally(() => {
          finishPrefetch();
          resolve();
        });
    });
  });
}

async function requestOffers(
  bookingUrl: string,
  guests: CruiseOffersGuestQuery,
  forceRefresh = false,
) {
  const params = new URLSearchParams({
    bookingUrl,
    adults: String(guests.adults),
    children: String(guests.children),
    infants: String(guests.infants),
    teens: String(guests.childrenTeen ?? 0),
  });
  if (forceRefresh) params.set("refresh", "1");

  try {
    const data = await fetchJsonWithRetry<{
      offers?: CruiseCabinOffer[];
      error?: string;
      guestSpecific?: boolean;
      source?: "disk" | "live";
      promoPending?: boolean;
    }>(`/api/cruise-offers?${params}`, {
      retries: forceRefresh ? 1 : 2,
      timeoutMs: 90_000,
      init: { cache: "no-store" },
    });

    return {
      offers: data.offers ?? [],
      guestSpecific: Boolean(data.guestSpecific && (data.offers?.length ?? 0)),
      fetchedAt: Date.now(),
      source: data.source === "disk" ? "disk" : "live",
      promoPending: Boolean(data.promoPending),
    } satisfies CruiseOffersPayload;
  } catch (error) {
    throw new Error(normalizeClientFetchError(error));
  }
}

export async function fetchCruiseOffers({
  bookingUrl,
  guests = CRUISE_OFFERS_REFERENCE_GUESTS,
  forceRefresh = false,
}: {
  bookingUrl: string;
  guests?: CruiseOffersGuestQuery;
  forceRefresh?: boolean;
}): Promise<CruiseOffersPayload> {
  const key = offersRequestKey(bookingUrl, guests);

  if (!forceRefresh) {
    const cached = readCache(key);
    const cachedHasPromo = cached?.offers.some((offer) =>
      isValidPromoid(offer.promoid),
    );
    if (cached && (cachedHasPromo || cached.offers.length === 0)) return cached;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = requestOffers(bookingUrl, guests, forceRefresh).then(
    async (payload) => {
      let resolved = payload;
      if (
        !forceRefresh &&
        payload.promoPending &&
        payload.offers.length > 0 &&
        !payload.offers.some((offer) => isValidPromoid(offer.promoid))
      ) {
        resolved = await requestOffers(bookingUrl, guests, true);
      }

      if (
        resolved.offers.length === 0 ||
        resolved.offers.some((offer) => isValidPromoid(offer.promoid))
      ) {
        cache.set(key, resolved);
      }
      return resolved;
    },
  );
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Quiet second pass after server finishes background m² enrichment. */
export function scheduleOffersAreaRefresh({
  bookingUrl,
  baselineOffers,
  onUpdate,
  isStale,
}: {
  bookingUrl: string;
  baselineOffers: CruiseCabinOffer[];
  onUpdate: (payload: CruiseOffersPayload) => void;
  isStale: () => boolean;
}) {
  const baselineAreas = countOfferAreas(baselineOffers);

  if (!offersMissingArea(baselineOffers)) return;

  window.setTimeout(() => {
    if (isStale()) return;
    void fetchCruiseOffers({
      bookingUrl,
      guests: CRUISE_OFFERS_REFERENCE_GUESTS,
      forceRefresh: true,
    })
      .then((payload) => {
        if (isStale()) return;
        const enriched =
          countOfferAreas(payload.offers) > baselineAreas ||
          !offersMissingArea(payload.offers);
        if (enriched) {
          onUpdate(payload);
        }
      })
      .catch(() => {
        // Optional enrichment; ignore.
      });
  }, 1600);
}
