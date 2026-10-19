import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  VISITOR_COOKIE,
  dismissConversationRating,
  getChatSettings,
  getConversation,
  submitConversationRating,
  syncRatingPrompt,
} from "@/lib/cms/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }

  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    return NextResponse.json({ ok: false, error: "no_visitor" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    conversationId?: string;
    rating?: number;
    comment?: string;
    dismiss?: boolean;
  } | null;

  if (!body?.conversationId) {
    return NextResponse.json(
      { ok: false, error: "missing_conversation" },
      { status: 400 }
    );
  }

  if (body.dismiss) {
    const conversation = dismissConversationRating({
      conversationId: body.conversationId,
      visitorId,
    });
    if (!conversation) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, conversation });
  }

  const conversation = submitConversationRating({
    conversationId: body.conversationId,
    visitorId,
    rating: Number(body.rating),
    comment: body.comment,
  });

  if (!conversation) {
    return NextResponse.json(
      { ok: false, error: "invalid_rating" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, conversation });
}

export async function GET(request: Request) {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }

  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    return NextResponse.json({ ok: true, conversation: null, askRating: false });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId") || "";
  let conversation = conversationId
    ? getConversation(conversationId)
    : null;

  if (conversation && conversation.visitorId !== visitorId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (conversation) {
    conversation = syncRatingPrompt(conversation);
  }

  return NextResponse.json({
    ok: true,
    conversation,
    askRating: conversation
      ? Boolean(conversation.ratingAskReason && conversation.rating == null)
      : false,
  });
}
