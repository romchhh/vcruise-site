import { NextResponse } from "next/server";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";

export async function GET() {
  const cruises = loadClientCruises();

  return NextResponse.json(
    { cruises },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
