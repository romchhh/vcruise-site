import { ownCruiseBookingUrl } from "./utils";
import type { CruiseRecord } from "./types";

/** Booking page of this itinerary, not a nearest-date link to another route. */
export function resolveBookingUrl(
  cruise: CruiseRecord,
  preferredDate?: string,
): string {
  if (preferredDate && preferredDate !== cruise.base_date_start) return "";
  return ownCruiseBookingUrl(cruise);
}
