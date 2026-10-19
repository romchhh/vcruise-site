import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import {
  addMessage,
  getChatSettings,
  getConversation,
  listMessages,
  markConversationRead,
  type ChatAttachment,
} from "@/lib/cms/chat";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const after = url.searchParams.get("after") || undefined;
  const markRead = url.searchParams.get("markRead") !== "0";

  if (markRead) {
    markConversationRead(id, "agent");
  }

  return NextResponse.json({
    ok: true,
    conversation: getConversation(id),
    messages: listMessages(id, after),
    incremental: Boolean(after),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (conversation.status === "closed") {
    return NextResponse.json(
      { ok: false, error: "conversation_closed" },
      { status: 409 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    text?: string;
    attachments?: ChatAttachment[];
  } | null;

  const settings = getChatSettings();
  const message = addMessage({
    conversationId: id,
    role: "agent",
    text: body?.text || "",
    attachments: body?.attachments,
    authorName: settings.chatAgentName,
  });

  if (!message) {
    return NextResponse.json(
      { ok: false, error: "empty_message" },
      { status: 400 }
    );
  }

  markConversationRead(id, "agent");

  return NextResponse.json({
    ok: true,
    message,
    conversation: getConversation(id),
  });
}
