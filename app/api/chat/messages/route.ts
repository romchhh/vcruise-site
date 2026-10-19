import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  VISITOR_COOKIE,
  addMessage,
  getChatSettings,
  getConversation,
  listMessages,
  markConversationRead,
  syncRatingPrompt,
  type ChatAttachment,
} from "@/lib/cms/chat";
import { cmsSettings } from "@/lib/cms/content";
import {
  formatChatTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

export const runtime = "nodejs";

async function assertVisitorOwns(conversationId: string) {
  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) return { error: "no_visitor" as const, conversation: null };
  const conversation = getConversation(conversationId);
  if (!conversation || conversation.visitorId !== visitorId) {
    return { error: "forbidden" as const, conversation: null };
  }
  return { error: null, conversation };
}

export async function GET(request: Request) {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId") || "";
  const after = url.searchParams.get("after") || undefined;
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "missing_conversation" },
      { status: 400 }
    );
  }

  const ownership = await assertVisitorOwns(conversationId);
  if (ownership.error) {
    return NextResponse.json(
      { ok: false, error: ownership.error },
      { status: ownership.error === "no_visitor" ? 401 : 403 }
    );
  }

  markConversationRead(conversationId, "visitor");
  const conversation = syncRatingPrompt(
    ownership.conversation || getConversation(conversationId)!
  );
  return NextResponse.json({
    ok: true,
    messages: listMessages(conversationId, after),
    conversation,
    askRating: Boolean(
      conversation.ratingAskReason && conversation.rating == null
    ),
  });
}

export async function POST(request: Request) {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    conversationId?: string;
    text?: string;
    attachments?: ChatAttachment[];
  } | null;

  if (!body?.conversationId) {
    return NextResponse.json(
      { ok: false, error: "missing_conversation" },
      { status: 400 }
    );
  }

  const ownership = await assertVisitorOwns(body.conversationId);
  if (ownership.error || !ownership.conversation) {
    return NextResponse.json(
      { ok: false, error: ownership.error || "forbidden" },
      { status: 403 }
    );
  }

  const previousVisitorMessages = listMessages(body.conversationId).filter(
    (item) => item.role === "visitor"
  ).length;

  const message = addMessage({
    conversationId: body.conversationId,
    role: "visitor",
    text: body.text || "",
    attachments: body.attachments,
  });

  if (!message) {
    return NextResponse.json(
      { ok: false, error: "empty_message" },
      { status: 400 }
    );
  }

  const conversation = getConversation(body.conversationId);

  let shouldNotifyTelegram = true;
  try {
    shouldNotifyTelegram = cmsSettings().telegramNotify !== false;
  } catch {
    shouldNotifyTelegram = true;
  }

  // Telegram лише на перший запит відвідувача в діалозі (не на кожне повідомлення).
  if (shouldNotifyTelegram && conversation && previousVisitorMessages === 0) {
    const text = formatChatTelegramMessage({
      visitorName: conversation.visitorName,
      visitorPhone: conversation.visitorPhone,
      page: conversation.page,
      text: message.text,
      hasAttachments: Boolean(message.attachments?.length),
      conversationId: conversation.id,
    });
    void sendTelegramMessage(text).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    message,
    conversation,
  });
}
