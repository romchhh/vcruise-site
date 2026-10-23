import type { ContactFormPayload, CruiseBookingDetails } from "./format-message";
import { isValidUaPhone, normalizeUaPhone } from "./phone";

function parseBooking(value: unknown): CruiseBookingDetails | null | undefined {
  if (!value || typeof value !== "object") return undefined;

  const booking = value as Record<string, unknown>;
  const linerName = String(
    booking.linerName ?? booking.liner ?? ""
  ).trim();
  const company = String(booking.company ?? "").trim();
  const region = String(booking.region ?? "").trim();
  const route = String(booking.route ?? "").trim();
  const cruiseDate = String(booking.cruiseDate ?? "").trim();
  const nightsRaw = Number(booking.nights);
  const nights = Number.isFinite(nightsRaw) && nightsRaw > 0
    ? Math.round(nightsRaw)
    : 1;
  const priceLabel = String(booking.priceLabel ?? "").trim();
  const cabinType = String(booking.cabinType ?? "").trim();
  const adultsRaw = Number(booking.adults);
  const childrenRaw = Number(booking.children);
  const infantsRaw = Number(booking.infants);
  const adults =
    Number.isFinite(adultsRaw) && adultsRaw > 0
      ? Math.min(20, Math.round(adultsRaw))
      : undefined;
  const children =
    Number.isFinite(childrenRaw) && childrenRaw > 0
      ? Math.min(20, Math.round(childrenRaw))
      : undefined;
  const infants =
    Number.isFinite(infantsRaw) && infantsRaw > 0
      ? Math.min(20, Math.round(infantsRaw))
      : undefined;

  if (!company && !linerName) {
    return null;
  }

  if (cruiseDate && !/^\d{4}-\d{2}-\d{2}$/.test(cruiseDate)) {
    return null;
  }

  return {
    linerName: (linerName || company).slice(0, 120),
    company: (company || linerName).slice(0, 120),
    region: (region || "Не вказано").slice(0, 120),
    route: (route || "Уточнюється").slice(0, 500),
    cruiseDate: cruiseDate || new Date().toISOString().slice(0, 10),
    nights,
    cabinType: cabinType ? cabinType.slice(0, 80) : undefined,
    priceLabel: priceLabel ? priceLabel.slice(0, 80) : undefined,
    adults,
    children,
    infants,
  };
}

export type ParseContactResult =
  | { ok: true; payload: ContactFormPayload }
  | { ok: false; error: string };

export function parseContactRequest(
  body: Record<string, unknown>
): ParseContactResult {
  const name = String(body.name ?? "").trim();

  if (!name || name.length < 2 || name.length > 80) {
    return { ok: false, error: "Вкажіть ім'я (мінімум 2 символи)." };
  }

  const phoneRaw = String(body.phone ?? "");
  if (!isValidUaPhone(phoneRaw)) {
    return {
      ok: false,
      error: "Вкажіть коректний номер телефону у форматі +380 (XX) XXX-XX-XX.",
    };
  }

  const details = String(body.details ?? "").trim();
  let booking: CruiseBookingDetails | undefined;

  if (body.booking) {
    const parsedBooking = parseBooking(body.booking);
    if (!parsedBooking) {
      return {
        ok: false,
        error: "Не вдалося зібрати дані круїзу. Закрийте вікно і спробуйте ще раз.",
      };
    }
    booking = parsedBooking;
  }

  return {
    ok: true,
    payload: {
      name,
      phone: normalizeUaPhone(phoneRaw),
      details: details ? details.slice(0, 1000) : undefined,
      booking,
    },
  };
}
