import { NextResponse } from "next/server";
import { fetchCabinAvailability } from "@/lib/cruise-search/cabin-availability";
import {
  isAllowedBookingUrl,
  mapGuestsToFourgates,
} from "@/lib/cruise-search/fourgates-offers";

export const runtime = "nodejs";

const CODE = /^[A-Za-z0-9]{1,16}$/;
const PROMO = /^[A-Za-z0-9_-]{1,80}$/;

function count(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(0, parsed));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookingUrl = searchParams.get("bookingUrl")?.trim() ?? "";
  const cabinCode = searchParams.get("cabinCode")?.trim() ?? "";
  const promoid = searchParams.get("promoid")?.trim() ?? "";

  if (!bookingUrl || !isAllowedBookingUrl(bookingUrl)) {
    return NextResponse.json(
      { error: "Потрібне коректне bookingUrl з 4gates." },
      { status: 400 },
    );
  }
  if (!CODE.test(cabinCode) || !PROMO.test(promoid)) {
    return NextResponse.json(
      { error: "Некоректний тариф каюти." },
      { status: 400 },
    );
  }

  const guests = mapGuestsToFourgates(
    Math.max(1, count(searchParams.get("adults"), 2, 8)),
    count(searchParams.get("children"), 0, 8),
    0,
    count(searchParams.get("teens"), 0, 8),
  );

  try {
    const availability = await fetchCabinAvailability({
      bookingUrl,
      cabinCode,
      promoid,
      adults: guests.adults,
      childrenYoung: guests.childrenYoung,
      childrenTeen: guests.childrenTeen,
    });
    return NextResponse.json(availability, {
      headers: {
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message !== "fetch failed"
        ? error.message
        : "Не вдалося завантажити план палуби. Спробуйте ще раз.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
