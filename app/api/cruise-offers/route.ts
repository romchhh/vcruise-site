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
import { normalizeCruiseCabinOffer } from "@/lib/cruise-search/offer-key";
import type { CruiseCabinOffer } from "@/lib/cruise-search/types";

export const runtime = "nodejs";

function normalizeOffers(offers: CruiseCabinOffer[]) {
  return offers.map(normalizeCruiseCabinOffer);
}

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
  const teens = Number.parseInt(searchParams.get("teens") ?? "0", 10);
  const safeAdults = Number.isFinite(adults)
    ? Math.min(8, Math.max(1, adults))
    : 2;
  const safeChildren = Number.isFinite(children)
    ? Math.min(8, Math.max(0, children))
    : 0;
  const safeTeens = Number.isFinite(teens)
    ? Math.min(8, Math.max(0, teens))
    : 0;
  const referenceParty =
    safeAdults === 2 && safeChildren === 0 && safeTeens === 0;
  const diskOffers = offersForBookingUrl(bookingUrl);

  try {
    const guests = mapGuestsToFourgates(
      safeAdults,
      safeChildren,
      0,
      safeTeens,
    );
    let offers: CruiseCabinOffer[] = [];
    let source: "live" | "disk" = "live";
    try {
      offers = normalizeOffers(await fetchFourgatesOffers(bookingUrl, guests));
    } catch {
      offers = [];
    }

    if (!offers.length && diskOffers?.length) {
      offers = normalizeOffers(diskOffers);
      source = "disk";
    }

    if (!offers.length) {
      return NextResponse.json(
        {
          offers: [],
          guestSpecific: false,
          source,
          unavailable: true,
          error: "Тарифи тимчасово недоступні. Спробуйте пізніше.",
        },
        {
          status: 200,
          headers: { "Cache-Control": "private, max-age=60" },
        },
      );
    }

    if (referenceParty && source === "live") {
      try {
        rememberDiskOffers(bookingUrl, offers);
      } catch {
        // The response is still valid if the disk cache cannot be updated.
      }
    }

    return NextResponse.json(
      {
        offers,
        guestSpecific: !referenceParty && offers.length > 0,
        source,
        stale: source === "disk",
      },
      {
        headers: {
          "Cache-Control":
            source === "live"
              ? "private, max-age=120, stale-while-revalidate=300"
              : "private, max-age=30",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося завантажити каюти.";
    return NextResponse.json({ error: message, offers: [] }, { status: 502 });
  }
}
