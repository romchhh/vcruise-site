import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import { isCardSection } from "@/lib/cms/section-items";
import { suggestCardsFor } from "@/lib/cms/section-items-server";
import type { ContentBlockKey } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const key = new URL(request.url).searchParams.get("key") as ContentBlockKey | null;
  if (!key || !isCardSection(key)) {
    return NextResponse.json(
      { ok: false, error: "invalid_key" },
      { status: 400 },
    );
  }

  try {
    const items = suggestCardsFor(key);
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "suggest_failed",
      },
      { status: 500 },
    );
  }
}
