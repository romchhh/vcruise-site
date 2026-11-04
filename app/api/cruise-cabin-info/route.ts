import { NextResponse } from "next/server";
import { fetchCabinInfo } from "@/lib/cruise-search/cabin-info";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shipId = searchParams.get("shipId")?.trim() ?? "";
  const cabinCode = searchParams.get("cabinCode")?.trim() ?? "";

  if (!/^\d{1,8}$/.test(shipId) || !/^[A-Za-z0-9]{1,16}$/.test(cabinCode)) {
    return NextResponse.json(
      { error: "Некоректний код каюти." },
      { status: 400 },
    );
  }

  try {
    const info = await fetchCabinInfo(shipId, cabinCode);
    return NextResponse.json(info, {
      headers: { "Cache-Control": "private, max-age=86400" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не вдалося завантажити опис.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
