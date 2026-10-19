"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/components/admin/adminApi";
import { Field, Modal } from "@/components/admin/AdminForm";
import {
  AdminPageHeader,
  DangerButton,
  GhostButton,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import { playIncomingChatSound, unlockChatSound } from "@/lib/chat/sound";
import { formatKyivDateTime, formatKyivTime } from "@/lib/datetime";
import { guessMimeFromName, isChatImage } from "@/lib/chat/media";
import type {
  ChatAttachment,
  ChatConversation,
  ChatMessage,
  ChatPreset,
  ChatPresetKind,
} from "@/lib/cms/chat";
import styles from "./ChatView.module.css";

type Tab = "inbox" | "presets";

type PendingAdminFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
  mode: "replace" | "append"
): ChatMessage[] {
  if (mode === "replace") {
    return [...incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  if (incoming.length === 0) return current;
  const map = new Map(current.map((item) => [item.id, item]));
  let added = false;
  for (const message of incoming) {
    if (!map.has(message.id)) added = true;
    map.set(message.id, message);
  }
  if (!added && incoming.every((m) => current.some((c) => c.id === m.id))) {
    return current;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

function isNearBottom(el: HTMLDivElement | null, threshold = 80) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export default function ChatView() {
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("c");
  const [tab, setTab] = useState<Tab>("inbox");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(deepLinkId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [text, setText] = useState("");
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [agentReplies, setAgentReplies] = useState<ChatPreset[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingAdminFile[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [presetModal, setPresetModal] = useState<ChatPreset | null>(null);
  const [creating, setCreating] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "polling">(
    "connecting"
  );
  const [chatEnabled, setChatEnabled] = useState(true);
  const [togglingChat, setTogglingChat] = useState(false);
  const [ratingStats, setRatingStats] = useState<{
    count: number;
    average: number | null;
  } | null>(null);

  const heardMessageIds = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const stickToBottomRef = useRef(true);
  const loadingThreadRef = useRef(false);

  activeIdRef.current = activeId;
  messagesRef.current = messages;

  const active = useMemo(
    () => conversations.find((item) => item.id === activeId) || null,
    [conversations, activeId]
  );

  const scrollThreadToBottom = useCallback((force = false) => {
    const el = threadRef.current;
    if (!el) return;
    if (!force && !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
  }, []);

  const refreshConversations = useCallback(async () => {
    const data = await adminFetch<{
      conversations: ChatConversation[];
      unreadTotal: number;
      chatEnabled?: boolean;
      ratings?: { count: number; average: number | null };
    }>("/api/admin/chat");
    const next = data.conversations;

    setConversations(next);
    if (typeof data.chatEnabled === "boolean") {
      setChatEnabled(data.chatEnabled);
    }
    if (data.ratings) {
      setRatingStats({
        count: data.ratings.count,
        average: data.ratings.average,
      });
    }
    return next;
  }, []);

  async function toggleChatOnSite() {
    if (togglingChat) return;
    setTogglingChat(true);
    setSendError(null);
    const next = !chatEnabled;
    setChatEnabled(next);
    try {
      const data = await adminFetch<{ chatEnabled: boolean }>(
        "/api/admin/chat",
        {
          method: "PATCH",
          body: JSON.stringify({ chatEnabled: next }),
        }
      );
      setChatEnabled(data.chatEnabled !== false);
    } catch (err) {
      setChatEnabled(!next);
      setSendError(
        err instanceof Error
          ? err.message
          : "Не вдалося змінити видимість чату"
      );
    } finally {
      setTogglingChat(false);
    }
  }

  const loadThread = useCallback(
    async (id: string, options?: { quiet?: boolean }) => {
      if (loadingThreadRef.current && !options?.quiet) return;
      loadingThreadRef.current = true;
      if (!options?.quiet) setThreadLoading(true);
      try {
        const data = await adminFetch<{
          conversation: ChatConversation;
          messages: ChatMessage[];
        }>(`/api/admin/chat/${id}`);
        if (activeIdRef.current !== id) return;
        setMessages(mergeMessages([], data.messages, "replace"));
        setConversations((current) =>
          current.map((item) =>
            item.id === id
              ? { ...data.conversation, unreadByAgent: 0 }
              : item
          )
        );
        stickToBottomRef.current = true;
        scrollThreadToBottom(true);
      } finally {
        loadingThreadRef.current = false;
        if (!options?.quiet) setThreadLoading(false);
      }
    },
    [scrollThreadToBottom]
  );

  const pullDelta = useCallback(
    async (id: string) => {
      const after = messagesRef.current[messagesRef.current.length - 1]?.createdAt;
      const query = after
        ? `?after=${encodeURIComponent(after)}&markRead=1`
        : "";
      const data = await adminFetch<{
        conversation: ChatConversation;
        messages: ChatMessage[];
        incremental?: boolean;
      }>(`/api/admin/chat/${id}${query}`);

      if (activeIdRef.current !== id) return;

      if (!after || !data.incremental) {
        setMessages(mergeMessages([], data.messages, "replace"));
      } else if (data.messages.length > 0) {
        setMessages((current) => mergeMessages(current, data.messages, "append"));
      }

      setConversations((current) =>
        current.map((item) =>
          item.id === id ? { ...data.conversation, unreadByAgent: 0 } : item
        )
      );
      scrollThreadToBottom();
    },
    [scrollThreadToBottom]
  );

  const loadPresets = useCallback(async () => {
    const data = await adminFetch<{ presets: ChatPreset[] }>(
      "/api/admin/chat/presets"
    );
    setPresets(data.presets);
    setAgentReplies(
      data.presets.filter(
        (preset) => preset.kind === "agent_reply" && preset.active
      )
    );
  }, []);

  useEffect(() => {
    unlockChatSound();
    void refreshConversations()
      .then((list) => {
        const wanted = deepLinkId || activeIdRef.current;
        if (wanted && list.some((item) => item.id === wanted)) {
          setActiveId(wanted);
        }
      })
      .catch(() => undefined);
    void loadPresets().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + deep link once
  }, [loadPresets, refreshConversations, deepLinkId]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      messagesRef.current = [];
      setSendError(null);
      return;
    }
    setMessages([]);
    messagesRef.current = [];
    setText("");
    setPendingFiles((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setSendError(null);
    void loadThread(activeId).catch(() => undefined);
  }, [activeId, loadThread]);

  // Live updates: SSE primary, poll only as fallback
  useEffect(() => {
    let stopped = false;
    let source: EventSource | null = null;
    let pollTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let sseOk = false;

    const stopPoll = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPoll = () => {
      if (stopped || pollTimer) return;
      setLiveState("polling");
      pollTimer = window.setInterval(() => {
        void refreshConversations().catch(() => undefined);
        if (activeIdRef.current) {
          void pullDelta(activeIdRef.current).catch(() => undefined);
        }
      }, 5000);
    };

    const handleLiveEvent = (payload: {
      type?: string;
      role?: string;
      messageId?: string;
      conversationId?: string;
    }) => {
      if (payload.type !== "message" && payload.type !== "conversation") return;

      void refreshConversations().catch(() => undefined);

      const active = activeIdRef.current;
      if (
        payload.type === "message" &&
        payload.conversationId &&
        payload.conversationId === active
      ) {
        if (
          payload.role === "visitor" &&
          payload.messageId &&
          !heardMessageIds.current.has(payload.messageId)
        ) {
          heardMessageIds.current.add(payload.messageId);
          playIncomingChatSound();
        }
        void pullDelta(payload.conversationId).catch(() => undefined);
      } else if (
        payload.type === "conversation" &&
        payload.conversationId === active
      ) {
        void pullDelta(payload.conversationId).catch(() => undefined);
      }
    };

    const connect = () => {
      if (stopped) return;
      setLiveState("connecting");
      try {
        source = new EventSource("/api/admin/chat/stream");
        source.onopen = () => {
          sseOk = true;
          setLiveState("live");
          stopPoll();
        };
        source.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as {
              type?: string;
              role?: string;
              messageId?: string;
              conversationId?: string;
            };
            if (payload.type === "ready") {
              sseOk = true;
              setLiveState("live");
              stopPoll();
              return;
            }
            handleLiveEvent(payload);
          } catch {
            // ignore malformed
          }
        };
        source.onerror = () => {
          source?.close();
          source = null;
          sseOk = false;
          if (stopped) return;
          startPoll();
          reconnectTimer = window.setTimeout(connect, 4000);
        };
      } catch {
        startPoll();
      }
    };

    connect();

    return () => {
      stopped = true;
      source?.close();
      stopPoll();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      void sseOk;
    };
  }, [pullDelta, refreshConversations]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  async function uploadFiles(
    files: PendingAdminFile[]
  ): Promise<ChatAttachment[]> {
    if (files.length === 0) return [];
    const body = new FormData();
    files.forEach((item) => body.append("files", item.file));
    const response = await fetch("/api/admin/chat/upload", {
      method: "POST",
      body,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "upload_failed");
    const items = (data.items || []) as ChatAttachment[];
    if (items.length > 0) return items;
    const urls: string[] = data.urls || [];
    return urls.map((url, index) => {
      const file = files[index]?.file;
      const name = file?.name || "file";
      return {
        url,
        name,
        mime: file?.type || guessMimeFromName(name),
        size: file?.size || 0,
      };
    });
  }

  function addPending(files: File[]) {
    setPendingFiles((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      })),
    ]);
  }

  function clearPending() {
    setPendingFiles((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  }

  async function sendReply(overrideText?: string) {
    if (!activeId || sending) return;
    const value = (overrideText ?? text).trim();
    if (!value && pendingFiles.length === 0) return;
    setSending(true);
    setSendError(null);
    stickToBottomRef.current = true;
    try {
      const attachments = await uploadFiles(pendingFiles);
      const data = await adminFetch<{
        message: ChatMessage;
        conversation: ChatConversation;
      }>(`/api/admin/chat/${activeId}`, {
        method: "POST",
        body: JSON.stringify({ text: value, attachments }),
      });
      setMessages((current) =>
        mergeMessages(current, [data.message], "append")
      );
      setConversations((current) => {
        const next = current.map((item) =>
          item.id === activeId ? data.conversation : item
        );
        return next.sort((a, b) =>
          b.lastMessageAt.localeCompare(a.lastMessageAt)
        );
      });
      if (overrideText === undefined) setText("");
      clearPending();
      scrollThreadToBottom(true);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Не вдалося надіслати"
      );
    } finally {
      setSending(false);
    }
  }

  async function setConversationStatus(status: "open" | "closed") {
    if (!activeId) return;
    const id = activeId;
    setSendError(null);

    // Optimistic UI so the button never feels "dead".
    setConversations((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              ratingAskReason:
                status === "closed" && item.rating == null
                  ? "closed"
                  : status === "open"
                    ? null
                    : item.ratingAskReason,
            }
          : item
      )
    );

    try {
      const data = await adminFetch<{
        ok: boolean;
        conversation: ChatConversation;
      }>("/api/admin/chat", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      if (data.conversation) {
        setConversations((current) =>
          current.map((item) =>
            item.id === id ? data.conversation : item
          )
        );
      }
    } catch (err) {
      // Revert optimistic change on failure.
      void refreshConversations().catch(() => undefined);
      setSendError(
        err instanceof Error ? err.message : "Не вдалося змінити статус діалогу"
      );
    }
  }

  async function savePreset(form: ChatPreset) {
    const data = await adminFetch<{ presets: ChatPreset[] }>(
      "/api/admin/chat/presets",
      { method: "PUT", body: JSON.stringify(form) }
    );
    setPresets(data.presets);
    setAgentReplies(
      data.presets.filter(
        (preset) => preset.kind === "agent_reply" && preset.active
      )
    );
    setPresetModal(null);
    setCreating(false);
  }

  async function removePreset(id: string) {
    const data = await adminFetch<{ presets: ChatPreset[] }>(
      `/api/admin/chat/presets?id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    setPresets(data.presets);
    setAgentReplies(
      data.presets.filter(
        (preset) => preset.kind === "agent_reply" && preset.active
      )
    );
  }

  const emptyPreset = (kind: ChatPresetKind): ChatPreset => ({
    id: "",
    kind,
    label: "",
    text: "",
    sortOrder: presets.filter((p) => p.kind === kind).length + 1,
    active: true,
  });

  const liveLabel =
    liveState === "live"
      ? "Онлайн"
      : liveState === "polling"
        ? "Опитування"
        : "Підключення…";

  return (
    <div onPointerDown={unlockChatSound}>
      <AdminPageHeader
        title="Онлайн-чат"
        description="Діалоги з сайту в реальному часі. Кнопкою нижче вмикаєте або ховаєте віджет на сайті."
        action={
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.siteToggle} ${
                chatEnabled ? styles.siteToggleOn : styles.siteToggleOff
              }`}
              onClick={() => void toggleChatOnSite()}
              disabled={togglingChat}
              aria-pressed={chatEnabled}
              title={
                chatEnabled
                  ? "Чат зараз видно на сайті — натисніть, щоб вимкнути"
                  : "Чат сховано на сайті — натисніть, щоб увімкнути"
              }
            >
              <span className={styles.siteToggleKnob} aria-hidden />
              <span>
                {togglingChat
                  ? "…"
                  : chatEnabled
                    ? "Чат на сайті: увімкнено"
                    : "Чат на сайті: вимкнено"}
              </span>
            </button>
            <span className={`${styles.livePill} ${styles[`live_${liveState}`]}`}>
              <span className={styles.liveDot} aria-hidden />
              {liveLabel}
            </span>
            <button
              type="button"
              className={`${ui.filterChip} ${tab === "inbox" ? ui.filterChipActive : ""}`}
              onClick={() => setTab("inbox")}
            >
              Діалоги
            </button>
            <button
              type="button"
              className={`${ui.filterChip} ${tab === "presets" ? ui.filterChipActive : ""}`}
              onClick={() => setTab("presets")}
            >
              Заготовки
            </button>
          </div>
        }
      />

      {!chatEnabled ? (
        <p className={styles.siteOffBanner}>
          Віджет чату зараз вимкнено — відвідувачі його не бачать. Адмін-діалоги
          зберігаються.
        </p>
      ) : null}

      {tab === "inbox" ? (
        <div className={styles.layout} data-tour="tour-chat-inbox">
          <aside className={styles.list}>
            <div className={styles.listHead}>
              <div>
                <h3>Всі діалоги</h3>
                {ratingStats && ratingStats.count > 0 ? (
                  <p className={styles.ratingSummary}>
                    ★ {ratingStats.average?.toFixed(1)} · {ratingStats.count}{" "}
                    оцінок
                  </p>
                ) : null}
              </div>
              <GhostButton
                onClick={() => void refreshConversations().catch(() => undefined)}
              >
                Оновити
              </GhostButton>
            </div>
            <div className={styles.convList}>
              {conversations.length === 0 ? (
                <p className={ui.empty} style={{ padding: 16 }}>
                  Поки немає звернень з віджета чату.
                </p>
              ) : (
                conversations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.convItem} ${
                      item.id === activeId ? styles.convItemActive : ""
                    }`}
                    onClick={() => setActiveId(item.id)}
                  >
                    <div className={styles.convTop}>
                      <span className={styles.convName}>
                        {item.visitorName || "Гість сайту"}
                      </span>
                      <span className={styles.convTime}>
                        {formatKyivTime(item.lastMessageAt)}
                      </span>
                    </div>
                    <p className={styles.convPreview}>{item.lastPreview}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <StatusBadge status={item.status} />
                      {typeof item.rating === "number" ? (
                        <span className={styles.ratingBadge}>
                          ★ {item.rating}
                        </span>
                      ) : null}
                      {item.unreadByAgent > 0 ? (
                        <span className={styles.unread}>
                          {item.unreadByAgent}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className={styles.thread}>
            {!active ? (
              <div className={styles.emptyThread}>
                Оберіть діалог зліва, щоб відповісти відвідувачу.
              </div>
            ) : (
              <>
                <div className={styles.threadHead}>
                  <div>
                    <h3>{active.visitorName || "Гість сайту"}</h3>
                    <p className={ui.tableHint} style={{ margin: "4px 0 0" }}>
                      {active.visitorPhone || "без телефону"} ·{" "}
                      {active.page || "/"} ·{" "}
                      {formatKyivDateTime(active.createdAt)}
                      {typeof active.rating === "number"
                        ? ` · ★ ${active.rating}/5`
                        : ""}
                    </p>
                    {active.ratingComment ? (
                      <p className={styles.ratingCommentAdmin}>
                        «{active.ratingComment}»
                      </p>
                    ) : null}
                    {sendError ? (
                      <p className={styles.sendError}>{sendError}</p>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {active.status === "open" ? (
                      <GhostButton
                        onClick={() => void setConversationStatus("closed")}
                      >
                        Закрити діалог
                      </GhostButton>
                    ) : (
                      <>
                        <StatusBadge status="closed" />
                        <GhostButton
                          onClick={() => void setConversationStatus("open")}
                        >
                          Відкрити знову
                        </GhostButton>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className={styles.messages}
                  ref={threadRef}
                  onScroll={() => {
                    stickToBottomRef.current = isNearBottom(threadRef.current);
                  }}
                >
                  {threadLoading && messages.length === 0 ? (
                    <p className={styles.threadHint}>Завантаження…</p>
                  ) : null}
                  {messages.map((message) => {
                    const images =
                      message.attachments?.filter(isChatImage) || [];
                    const files =
                      message.attachments?.filter(
                        (item) => !isChatImage(item)
                      ) || [];
                    const hasText = Boolean(message.text?.trim());
                    return (
                      <div
                        key={message.id}
                        className={`${styles.msg} ${
                          message.role === "visitor"
                            ? styles.msgVisitor
                            : message.role === "system"
                              ? styles.msgSystem
                              : styles.msgAgent
                        } ${!hasText && images.length ? styles.msgMedia : ""}`}
                      >
                        {hasText ? message.text : null}
                        {images.length > 0 ? (
                          <div
                            className={`${styles.imageGrid} ${
                              images.length === 1 ? styles.imageGridSingle : ""
                            }`}
                          >
                            {images.map((file) => (
                              <button
                                key={file.url}
                                type="button"
                                className={styles.imageThumb}
                                onClick={() => setLightbox(file.url)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {files.map((file) => (
                          <a
                            key={file.url}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.fileLink}
                          >
                            📎 {file.name}
                          </a>
                        ))}
                        <div className={styles.msgMeta}>
                          {message.role === "visitor"
                            ? "Клієнт"
                            : message.authorName || "Агент"}{" "}
                          · {formatKyivTime(message.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {active.status === "open" ? (
                  <div className={styles.composer}>
                    {agentReplies.length > 0 ? (
                      <div className={styles.canned}>
                        {agentReplies.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => void sendReply(preset.text)}
                            disabled={sending}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {pendingFiles.length > 0 ? (
                      <div className={styles.attachPreview}>
                        {pendingFiles.map((item) => (
                          <div key={item.id} className={styles.pendingCard}>
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.previewUrl} alt="" />
                            ) : (
                              <span className={styles.attachChip}>
                                {item.file.name}
                              </span>
                            )}
                            <button
                              type="button"
                              className={styles.pendingRemove}
                              aria-label="Прибрати"
                              onClick={() => {
                                if (item.previewUrl) {
                                  URL.revokeObjectURL(item.previewUrl);
                                }
                                setPendingFiles((current) =>
                                  current.filter((entry) => entry.id !== item.id)
                                );
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {sendError ? (
                      <p className={styles.sendError}>{sendError}</p>
                    ) : null}
                    <div className={styles.composeRow}>
                      <input
                        ref={fileRef}
                        type="file"
                        hidden
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(event) => {
                          addPending(Array.from(event.target.files || []));
                          event.target.value = "";
                        }}
                      />
                      <GhostButton
                        onClick={() => fileRef.current?.click()}
                        disabled={sending}
                      >
                        Фото / файл
                      </GhostButton>
                      <textarea
                        value={text}
                        placeholder="Відповідь клієнту…"
                        disabled={sending}
                        onChange={(event) => setText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void sendReply();
                          }
                        }}
                      />
                      <PrimaryButton
                        disabled={
                          sending ||
                          (!text.trim() && pendingFiles.length === 0)
                        }
                        onClick={() => void sendReply()}
                      >
                        {sending ? "…" : "Надіслати"}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className={styles.composerClosed}>
                    Діалог закрито. Відкрийте знову, щоб відповісти.
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      ) : (
        <section className={styles.presets}>
          <div className={styles.listHead}>
            <h3>Заготовлені питання та відповіді</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <GhostButton
                onClick={() => {
                  setCreating(true);
                  setPresetModal(emptyPreset("visitor_question"));
                }}
              >
                + Питання клієнта
              </GhostButton>
              <PrimaryButton
                onClick={() => {
                  setCreating(true);
                  setPresetModal(emptyPreset("agent_reply"));
                }}
              >
                + Відповідь агента
              </PrimaryButton>
            </div>
          </div>
          <div className={styles.presetGrid}>
            {presets.map((preset) => (
              <article key={preset.id} className={styles.presetCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{preset.label}</strong>
                  <StatusBadge
                    status={
                      preset.kind === "visitor_question" ? "new" : "published"
                    }
                  />
                </div>
                <p style={{ margin: 0, color: "var(--admin-muted)", fontSize: 13 }}>
                  {preset.kind === "visitor_question"
                    ? "Швидке питання у віджеті"
                    : "Швидка відповідь в адмінці"}
                </p>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{preset.text}</p>
                <div className={styles.presetActions}>
                  <GhostButton onClick={() => setPresetModal(preset)}>
                    Редагувати
                  </GhostButton>
                  <DangerButton onClick={() => void removePreset(preset.id)}>
                    Видалити
                  </DangerButton>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {lightbox ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className={styles.lightboxImage}
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            className={styles.lightboxClose}
            aria-label="Закрити"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {presetModal ? (
        <Modal
          title={creating ? "Нова заготовка" : "Редагувати заготовку"}
          onClose={() => {
            setPresetModal(null);
            setCreating(false);
          }}
        >
          <div className={ui.formGrid}>
            <Field label="Тип">
              <select
                value={presetModal.kind}
                onChange={(event) =>
                  setPresetModal({
                    ...presetModal,
                    kind: event.target.value as ChatPresetKind,
                  })
                }
              >
                <option value="visitor_question">Питання клієнта</option>
                <option value="agent_reply">Відповідь агента</option>
              </select>
            </Field>
            <Field label="Коротка назва">
              <input
                value={presetModal.label}
                onChange={(event) =>
                  setPresetModal({ ...presetModal, label: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Текст">
            <textarea
              value={presetModal.text}
              onChange={(event) =>
                setPresetModal({ ...presetModal, text: event.target.value })
              }
            />
          </Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={presetModal.active}
              onChange={(event) =>
                setPresetModal({
                  ...presetModal,
                  active: event.target.checked,
                })
              }
            />
            Активна
          </label>
          <div className={ui.formActions}>
            <PrimaryButton onClick={() => void savePreset(presetModal)}>
              Зберегти
            </PrimaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
