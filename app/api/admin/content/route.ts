import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/cms/session";
import { readDb, updateDb, type ContentBlock } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const blocks = [...readDb().blocks].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  return NextResponse.json({ ok: true, blocks });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as ContentBlock | null;
  if (!body?.id || !body.key) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  let saved: ContentBlock | null = null;
  updateDb((db) => {
    const index = db.blocks.findIndex((block) => block.id === body.id);
    if (index < 0) {
      db.blocks.push(body);
      saved = body;
      return;
    }
    saved = { ...db.blocks[index], ...body };
    db.blocks[index] = saved;
  });

  revalidatePath("/");

  return NextResponse.json({ ok: true, block: saved });
}
