import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import { buildCruisePickOptions } from "@/lib/cms/curated-cruise-cards";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const options = buildCruisePickOptions(loadClientCruises());
    const companies = Array.from(
      new Set(options.map((item) => item.company)),
    ).sort((a, b) => a.localeCompare(b, "uk"));

    return NextResponse.json({ ok: true, companies, options });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "cruises_failed",
      },
      { status: 500 },
    );
  }
}
