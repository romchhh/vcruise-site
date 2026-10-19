import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import { readDb, updateDb, type SiteSettings } from "@/lib/cms/store";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({ ok: true, settings: readDb().settings });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as SiteSettings | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const cms = updateDb((db) => {
    db.settings = { ...db.settings, ...body };
  });

  revalidatePath("/");
  revalidatePath("/privacy");
  revalidatePath("/terms");

  return NextResponse.json({ ok: true, settings: cms.settings });
}
