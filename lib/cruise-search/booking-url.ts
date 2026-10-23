import { getUpcomingDates } from "./utils";
import type { CruiseRecord } from "./types";

export function resolveBookingUrl(
  cruise: CruiseRecord,
  preferredDate?: string,
): string {
  const dates = getUpcomingDates(cruise);
  if (!dates.length) return "";

  const entry = preferredDate
    ? dates.find((item) => item.date === preferredDate) ?? dates[0]
    : dates[0];

  return entry?.booking_url?.trim() ?? "";
}
