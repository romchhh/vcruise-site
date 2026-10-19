import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/cms/session";
import {
  closeConversation,
  countUnreadForAgent,
  getChatRatingStats,
  getChatSettings,
  listConversations,
  updateConversation,
} from "@/lib/cms/chat";
import { updateDb } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = getChatSettings();

  return NextResponse.json({
    ok: true,
    chatEnabled: settings.chatEnabled !== false,
    conversations: listConversations(),
    unreadTotal: countUnreadForAgent(),
    ratings: getChatRatingStats(),
  });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: "open" | "closed";
    visitorName?: string;
    visitorPhone?: string;
    chatEnabled?: boolean;
  } | null;

  if (typeof body?.chatEnabled === "boolean" && !body.id) {
    const cms = updateDb((db) => {
      db.settings = {
        ...db.settings,
        chatEnabled: body.chatEnabled as boolean,
      };
    });
    revalidatePath("/");
    return NextResponse.json({
      ok: true,
      chatEnabled: cms.settings.chatEnabled !== false,
    });
  }

  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const conversation =
    body.status === "closed"
      ? closeConversation(body.id)
      : updateConversation(body.id, {
          status: body.status,
          visitorName: body.visitorName,
          visitorPhone: body.visitorPhone,
          ...(body.status === "open" ? { ratingAskReason: null } : {}),
        });

  if (!conversation) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, conversation });
}
