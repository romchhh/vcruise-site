import { NextResponse } from "next/server";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { loadOffersCacheMeta } from "@/lib/cruise-search/load-offers-cache";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  Vary: "Accept-Encoding",
};

export async function GET() {
  // Do not pre-gzip here: Next.js 16.4.5+ strips Content-Encoding from Route
  // Handlers while keeping the body bytes, so clients get gzip as "JSON".
  // Compression is handled by `next start` / nginx.
  const cruises = loadClientCruises({ includeOffers: false });
  const offersCache = loadOffersCacheMeta();
  return NextResponse.json(
    { cruises, offersCache },
    { headers: CACHE_HEADERS },
  );
}
