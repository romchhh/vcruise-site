import { NextResponse } from "next/server";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { loadOffersCacheMeta } from "@/lib/cruise-search/load-offers-cache";

export async function GET() {
  const cruises = loadClientCruises();
  const offersCache = loadOffersCacheMeta();

  return NextResponse.json(
    { cruises, offersCache },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
