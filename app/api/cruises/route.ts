import { gzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { loadOffersCacheMeta } from "@/lib/cruise-search/load-offers-cache";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  Vary: "Accept-Encoding",
};

export async function GET(request: Request) {
  const cruises = loadClientCruises({ includeOffers: false });
  const offersCache = loadOffersCacheMeta();
  const payload = JSON.stringify({ cruises, offersCache });
  const accept = request.headers.get("accept-encoding") ?? "";

  if (accept.includes("gzip")) {
    const compressed = gzipSync(payload);
    return new NextResponse(compressed, {
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Encoding": "gzip",
      },
    });
  }

  return NextResponse.json({ cruises, offersCache }, { headers: CACHE_HEADERS });
}
