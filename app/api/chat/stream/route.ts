import { cookies } from "next/headers";
import {
  VISITOR_COOKIE,
  getChatSettings,
  getConversation,
} from "@/lib/cms/chat";
import { subscribeChatEvents } from "@/lib/cms/chat-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const settings = getChatSettings();
  if (!settings.chatEnabled) {
    return new Response("disabled", { status: 403 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId") || "";
  if (!conversationId) {
    return new Response("missing_conversation", { status: 400 });
  }

  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  const conversation = getConversation(conversationId);
  if (!visitorId || !conversation || conversation.visitorId !== visitorId) {
    return new Response("forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      send({ type: "ready", conversationId, at: new Date().toISOString() });

      unsubscribe = subscribeChatEvents((event) => {
        if (event.conversationId !== conversationId) return;
        send(event);
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
