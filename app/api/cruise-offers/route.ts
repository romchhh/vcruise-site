import { NextResponse } from "next/server";
import {
  fetchFourgatesOffers,
  isAllowedBookingUrl,
  mapGuestsToFourgates,
  warmFourgatesSession,
} from "@/lib/cruise-search/fourgates-offers";
import {
  offersForBookingUrl,
  rememberDiskOffers,
} from "@/lib/cruise-search/load-offers-cache";

export const runtime = "nodejs";

const CACHE_SEC = 900;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("warm") === "1") {
    try {
      await warmFourgatesSession();
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  }

  const bookingUrl = searchParams.get("bookingUrl")?.trim() ?? "";
  if (!bookingUrl || !isAllowedBookingUrl(bookingUrl)) {
    return NextResponse.json(
      { error: "Потрібне коректне bookingUrl з 4gates." },
      { status: 400 },
    );
  }

  const adults = Number.parseInt(searchParams.get("adults") ?? "2", 10);
  const children = Number.parseInt(searchParams.get("children") ?? "0", 10);
  const safeAdults = Number.isFinite(adults)
    ? Math.min(8, Math.max(1, adults))
    : 2;
  const safeChildren = Number.isFinite(children)
    ? Math.min(8, Math.max(0, children))
    : 0;
  const referenceParty = safeAdults === 2 && safeChildren === 0;

  try {
    const skipDisk = searchParams.get("refresh") === "1";
    if (!skipDisk && referenceParty) {
      const diskOffers = offersForBookingUrl(bookingUrl);
      if (diskOffers?.length) {
        return NextResponse.json(
          { offers: diskOffers, guestSpecific: false, source: "disk" },
          {
            headers: {
              "Cache-Control": `private, max-age=${CACHE_SEC}, stale-while-revalidate=1800`,
            },
          },
        );
      }
    }

    const guests = mapGuestsToFourgates(safeAdults, safeChildren, 0);
    const offers = await fetchFourgatesOffers(bookingUrl, guests);

    if (referenceParty && offers.length) {
      try {
        rememberDiskOffers(bookingUrl, offers);
      } catch {
        // The response is still valid if the disk cache cannot be updated.
      }
    }

    return NextResponse.json(
      { offers, guestSpecific: !referenceParty && offers.length > 0, source: "live" },
      {
        headers: {
          "Cache-Control": `private, max-age=${CACHE_SEC}, stale-while-revalidate=1800`,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося завантажити каюти.";
    return NextResponse.json({ error: message, offers: [] }, { status: 502 });
  }
}
