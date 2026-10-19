export type ChatLiveEvent = {
  type: "message" | "conversation" | "typing";
  conversationId: string;
  at: string;
  messageId?: string;
  role?: "visitor" | "agent" | "system";
};

type Listener = (event: ChatLiveEvent) => void;

declare global {
  // eslint-disable-next-line no-var
  var __vcruiseChatListeners: Set<Listener> | undefined;
}

function listeners() {
  if (!globalThis.__vcruiseChatListeners) {
    globalThis.__vcruiseChatListeners = new Set();
  }
  return globalThis.__vcruiseChatListeners;
}

export function publishChatEvent(event: ChatLiveEvent) {
  const snapshot = Array.from(listeners());
  for (const listener of snapshot) {
    try {
      listener(event);
    } catch {
      // Drop dead SSE subscribers so one closed stream cannot break writers.
      listeners().delete(listener);
    }
  }
}

export function subscribeChatEvents(listener: Listener) {
  listeners().add(listener);
  return () => {
    listeners().delete(listener);
  };
}
