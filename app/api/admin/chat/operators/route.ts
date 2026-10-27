import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import {
  getActiveChatOperatorId,
  listChatOperators,
  saveChatOperators,
  type ChatOperator,
} from "@/lib/cms/chat";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return NextResponse.json({
    ok: true,
    operators: listChatOperators(),
    activeOperatorId: getActiveChatOperatorId(),
  });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    operators?: ChatOperator[];
    activeOperatorId?: string;
  } | null;

  if (!body?.operators || !Array.isArray(body.operators)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = saveChatOperators({
      operators: body.operators,
      activeOperatorId: body.activeOperatorId || "",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "need_one_operator" },
      { status: 400 }
    );
  }
}
