import type { ContactFormPayload, CruiseBookingDetails } from "./format-message";
import { isValidUaPhone, normalizeUaPhone } from "./phone";

function optionalPositiveInt(value: unknown, max = 20) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.min(max, Math.round(raw));
}

function optionalYear(value: unknown) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 1900 || raw > 2100) return undefined;
  return Math.round(raw);
}

function optionalScore(value: unknown) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return undefined;
  return raw;
}

function parseBooking(value: unknown): CruiseBookingDetails | null | undefined {
  if (!value || typeof value !== "object") return undefined;

  const booking = value as Record<string, unknown>;
  const linerName = String(
    booking.linerName ?? booking.liner ?? "",
  ).trim();
  const company = String(booking.company ?? "").trim();
  const region = String(booking.region ?? "").trim();
  const route = String(booking.route ?? "").trim();
  const cruiseDate = String(booking.cruiseDate ?? "").trim();
  const cruiseDateEnd = String(booking.cruiseDateEnd ?? "").trim();
  const nightsRaw = Number(booking.nights);
  const nights =
    Number.isFinite(nightsRaw) && nightsRaw > 0 ? Math.round(nightsRaw) : 1;
  const priceLabel = String(booking.priceLabel ?? "").trim();
  const cabinType = String(booking.cabinType ?? "").trim();
  const cabinCode = String(booking.cabinCode ?? "").trim();
  const cabinName = String(booking.cabinName ?? "").trim();
  const tariffName = String(booking.tariffName ?? "").trim();
  const shipClass = String(booking.shipClass ?? "").trim();
  const companyClass = String(booking.companyClass ?? "").trim();
  const shipSize = String(booking.shipSize ?? "").trim();
  const bookingUrl = String(booking.bookingUrl ?? "").trim();

  const adults = optionalPositiveInt(booking.adults);
  const children = optionalPositiveInt(booking.children);
  const infants = optionalPositiveInt(booking.infants);
  const shipBuiltYear = optionalYear(booking.shipBuiltYear);
  const shipRenovatedYear = optionalYear(booking.shipRenovatedYear);
  const starRating = optionalScore(booking.starRating);
  const reviewScore = optionalScore(booking.reviewScore);
  const reviewCount = optionalPositiveInt(booking.reviewCount, 1_000_000);

  if (!company && !linerName) {
    return null;
  }

  if (cruiseDate && !/^\d{4}-\d{2}-\d{2}$/.test(cruiseDate)) {
    return null;
  }

  if (cruiseDateEnd && !/^\d{4}-\d{2}-\d{2}$/.test(cruiseDateEnd)) {
    return null;
  }

  const safeBookingUrl =
    bookingUrl.startsWith("https://") || bookingUrl.startsWith("http://")
      ? bookingUrl.slice(0, 500)
      : undefined;

  return {
    linerName: (linerName || company).slice(0, 120),
    company: (company || linerName).slice(0, 120),
    region: (region || "Не вказано").slice(0, 120),
    route: (route || "Уточнюється").slice(0, 800),
    cruiseDate: cruiseDate || new Date().toISOString().slice(0, 10),
    cruiseDateEnd: cruiseDateEnd || undefined,
    nights,
    cabinType: cabinType ? cabinType.slice(0, 80) : undefined,
    cabinCode: cabinCode ? cabinCode.slice(0, 40) : undefined,
    cabinName: cabinName ? cabinName.slice(0, 160) : undefined,
    tariffName: tariffName ? tariffName.slice(0, 80) : undefined,
    priceLabel: priceLabel ? priceLabel.slice(0, 80) : undefined,
    adults,
    children,
    infants,
    shipBuiltYear,
    shipRenovatedYear,
    shipClass: shipClass ? shipClass.slice(0, 120) : undefined,
    companyClass: companyClass ? companyClass.slice(0, 120) : undefined,
    shipSize: shipSize ? shipSize.slice(0, 40) : undefined,
    starRating,
    reviewScore,
    reviewCount,
    bookingUrl: safeBookingUrl,
  };
}

export type ParseContactResult =
  | { ok: true; payload: ContactFormPayload }
  | { ok: false; error: string };

export function parseContactRequest(
  body: Record<string, unknown>,
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
        error:
          "Не вдалося зібрати дані круїзу. Закрийте вікно і спробуйте ще раз.",
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
