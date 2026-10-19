import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import {
  deletePreset,
  listPresets,
  savePreset,
  type ChatPreset,
  type ChatPresetKind,
} from "@/lib/cms/chat";
import { uid } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({
    ok: true,
    presets: listPresets(),
  });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as Partial<ChatPreset> | null;
  if (!body?.kind || !body.label?.trim() || !body.text?.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const kind = body.kind as ChatPresetKind;
  if (kind !== "visitor_question" && kind !== "agent_reply") {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  const preset = savePreset({
    id: body.id || uid("preset"),
    kind,
    label: body.label.trim(),
    text: body.text.trim(),
    sortOrder: Number(body.sortOrder) || 99,
    active: body.active !== false,
  });

  return NextResponse.json({ ok: true, preset, presets: listPresets() });
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  deletePreset(id);
  return NextResponse.json({ ok: true, presets: listPresets() });
}
