import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  VISITOR_COOKIE,
  createConversation,
  getChatSettings,
  getConversation,
  getConversationByVisitor,
  listMessages,
  syncRatingPrompt,
  updateConversation,
} from "@/lib/cms/chat";
import { uid } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }

  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    return NextResponse.json({ ok: true, conversation: null, messages: [] });
  }

  const conversation = getConversationByVisitor(visitorId);
  if (!conversation) {
    return NextResponse.json({ ok: true, conversation: null, messages: [] });
  }

  const synced = syncRatingPrompt(conversation);
  return NextResponse.json({
    ok: true,
    conversation: synced,
    messages: listMessages(synced.id),
    askRating: Boolean(synced.ratingAskReason && synced.rating == null),
  });
}

export async function POST(request: Request) {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    page?: string;
    visitorName?: string;
    visitorPhone?: string;
    conversationId?: string;
  } | null;

  const jar = await cookies();
  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  let setCookie = false;
  if (!visitorId) {
    visitorId = uid("vis");
    setCookie = true;
  }

  let conversation =
    (body?.conversationId ? getConversation(body.conversationId) : null) ||
    getConversationByVisitor(visitorId);

  if (conversation && conversation.visitorId !== visitorId) {
    conversation = null;
  }

  if (!conversation) {
    conversation = createConversation({
      visitorId,
      page: body?.page,
      visitorName: body?.visitorName,
      visitorPhone: body?.visitorPhone,
    });
  } else if (body?.visitorName || body?.visitorPhone) {
    conversation =
      updateConversation(conversation.id, {
        visitorName: body.visitorName?.trim() || conversation.visitorName,
        visitorPhone: body.visitorPhone?.trim() || conversation.visitorPhone,
      }) || conversation;
  }

  const synced = syncRatingPrompt(conversation);
  const response = NextResponse.json({
    ok: true,
    conversation: synced,
    messages: listMessages(synced.id),
    askRating: Boolean(synced.ratingAskReason && synced.rating == null),
  });

  if (setCookie) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
