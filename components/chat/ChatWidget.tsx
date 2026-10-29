"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  playIncomingChatSound,
  unlockChatSound,
} from "@/lib/chat/sound";
import { isChatImage } from "@/lib/chat/media";
import { isValidChatPhone, normalizeChatPhone } from "@/lib/chat/phone";
import type {
  ChatAttachment,
  ChatConversation,
  ChatMessage,
} from "@/lib/cms/chat";
import styles from "./ChatWidget.module.css";

const DEFAULT_AGENT_IMAGE = "/images/chat-assistant.jpg";
const TEASER_DELAY_MS = 7000;
const TEASER_STORAGE_KEY = "vcruise-chat-teaser-dismissed";

function needsRating(conversation: ChatConversation) {
  return conversation.rating == null && Boolean(conversation.ratingAskReason);
}

type ChatQuestion = { id: string; label: string; text: string };

type ChatConfig = {
  enabled: boolean;
  welcomeMessage: string;
  agentName: string;
  agentImage: string;
  brandName: string;
  questions: ChatQuestion[];
};

type PendingFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function AgentPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = failed ? DEFAULT_AGENT_IMAGE : src || DEFAULT_AGENT_IMAGE;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => {
        if (!failed && resolved !== DEFAULT_AGENT_IMAGE) setFailed(true);
      }}
    />
  );
}

function contactCaptured(conversation: ChatConversation | null) {
  if (!conversation) return false;
  if (conversation.visitorContactCapturedAt) return true;
  return isValidChatPhone(conversation.visitorPhone || "");
}

export default function ChatWidget() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isHome = pathname === "/";
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [booting, setBooting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingThanks, setRatingThanks] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSaved, setContactSaved] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSoundId = useRef<string | null>(null);
  const primed = useRef(false);
  const openRef = useRef(false);

  openRef.current = open;

  const agentImage = config?.agentImage || DEFAULT_AGENT_IMAGE;
  const agentName = config?.agentName || "Консультант VCRUISE";
  const askRating = conversation ? needsRating(conversation) : false;
  const chatClosed = conversation?.status === "closed";
  const hasVisitorMessage = messages.some((item) => item.role === "visitor");
  const hasAgentReply = messages.some((item) => item.role === "agent");
  const needsContact = Boolean(
    conversation &&
      !chatClosed &&
      !askRating &&
      !contactSaved &&
      !contactCaptured(conversation) &&
      (hasVisitorMessage || hasAgentReply),
  );

  const applyConversation = useCallback((next: ChatConversation | null) => {
    if (!next) return;
    setConversation((current) => {
      const becameAsk =
        needsRating(next) && (!current || !needsRating(current));
      const justClosed =
        next.status === "closed" && current?.status !== "closed";
      if (becameAsk || justClosed) {
        queueMicrotask(() => {
          setOpen(true);
          setUnread((count) => Math.max(count, 1));
        });
      }
      return next;
    });
    if (next.rating != null) setRatingThanks(true);
    if (contactCaptured(next)) setContactSaved(true);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    void fetch("/api/chat/config")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.ok || !data.enabled) {
          setConfig({ ...data, enabled: false } as ChatConfig);
          return;
        }
        setConfig({
          enabled: true,
          welcomeMessage: data.welcomeMessage,
          agentName: data.agentName,
          agentImage: data.agentImage || DEFAULT_AGENT_IMAGE,
          brandName: data.brandName,
          questions: data.questions || [],
        });
      })
      .catch(() => setConfig({ enabled: false } as ChatConfig));
  }, []);

  useEffect(() => {
    if (!config?.enabled || !isHome || open) {
      setTeaserVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(TEASER_STORAGE_KEY) === "1") return;
    } catch {
      // ignore
    }
    const timer = window.setTimeout(() => {
      setTeaserVisible(true);
    }, TEASER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [config?.enabled, isHome, open]);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount
  }, []);

  const dismissTeaser = useCallback(() => {
    setTeaserVisible(false);
    try {
      sessionStorage.setItem(TEASER_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const ensureSession = useCallback(async () => {
    setBooting(true);
    try {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: window.location.pathname }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error("session_failed");
      applyConversation(data.conversation);
      setMessages(data.messages || []);
      primed.current = true;
      return data.conversation as ChatConversation;
    } finally {
      setBooting(false);
    }
  }, [applyConversation]);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const map = new Map(current.map((item) => [item.id, item]));
      let changed = false;
      for (const message of incoming) {
        if (!map.has(message.id)) {
          map.set(message.id, message);
          changed = true;
          if (
            primed.current &&
            (message.role === "agent" || message.role === "system") &&
            lastSoundId.current !== message.id
          ) {
            lastSoundId.current = message.id;
            if (!openRef.current) {
              setUnread((count) => count + 1);
            }
            playIncomingChatSound();
          }
        }
      }
      if (!changed) return current;
      return Array.from(map.values()).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
    });
  }, []);

  const pullMessages = useCallback(
    async (conversationId: string, after?: string) => {
      const query = new URLSearchParams({ conversationId });
      if (after) query.set("after", after);
      const response = await fetch(`/api/chat/messages?${query.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.messages) mergeMessages(data.messages);
      if (data.conversation) applyConversation(data.conversation);
    },
    [applyConversation, mergeMessages]
  );

  // Periodically sync rating prompt (inactivity after several hours).
  useEffect(() => {
    if (!config?.enabled || !conversation?.id || conversation.rating != null) {
      return;
    }
    const sync = () => {
      void fetch(
        `/api/chat/rating?conversationId=${encodeURIComponent(conversation.id)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data?.conversation) applyConversation(data.conversation);
        })
        .catch(() => undefined);
    };
    const interval = window.setInterval(sync, 60_000);
    const once = window.setTimeout(sync, 8_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(once);
    };
  }, [
    applyConversation,
    config?.enabled,
    conversation?.id,
    conversation?.rating,
  ]);

  useEffect(() => {
    if (!conversation) return;
    setContactName(conversation.visitorName || "");
    setContactPhone(conversation.visitorPhone || "");
    setContactSaved(contactCaptured(conversation));
  }, [
    conversation?.id,
    conversation?.visitorName,
    conversation?.visitorPhone,
    conversation?.visitorContactCapturedAt,
  ]);

  useEffect(() => {
    if (!open || !conversation) return;
    scrollToBottom();
  }, [messages, open, conversation, scrollToBottom]);

  useEffect(() => {
    if (!open || !conversation) return;

    let stopped = false;
    let source: EventSource | null = null;
    let pollTimer: number | null = null;

    const after = () => messages[messages.length - 1]?.createdAt;

    const startPoll = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(() => {
        void pullMessages(conversation.id, after());
      }, 2500);
    };

    try {
      source = new EventSource(
        `/api/chat/stream?conversationId=${encodeURIComponent(conversation.id)}`
      );
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "message" || payload.type === "conversation") {
            void pullMessages(conversation.id, after());
          }
        } catch {
          // ignore
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (!stopped) startPoll();
      };
    } catch {
      startPoll();
    }

    return () => {
      stopped = true;
      source?.close();
      if (pollTimer) window.clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only rebind on conversation/open
  }, [open, conversation?.id, pullMessages]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  async function handleOpen() {
    unlockChatSound();
    dismissTeaser();
    setOpen(true);
    setUnread(0);
    if (!conversation) {
      await ensureSession();
    }
  }

  function addPendingFiles(files: File[]) {
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

  function removePending(id: string) {
    setPendingFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  async function uploadPending(
    files: PendingFile[]
  ): Promise<ChatAttachment[]> {
    if (files.length === 0) return [];
    const body = new FormData();
    files.forEach((item) => body.append("files", item.file));
    const response = await fetch("/api/chat/upload", {
      method: "POST",
      body,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "upload_failed");
    return data.items as ChatAttachment[];
  }

  async function saveContact() {
    if (!conversation || contactBusy) return;
    setContactError("");
    if (!contactName.trim()) {
      setContactError("Вкажіть імʼя.");
      return;
    }
    if (!isValidChatPhone(contactPhone)) {
      setContactError("Вкажіть коректний номер телефону.");
      return;
    }
    setContactBusy(true);
    try {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          page: window.location.pathname,
          visitorName: contactName.trim(),
          visitorPhone: normalizeChatPhone(contactPhone),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error("contact_failed");
      if (data.conversation) applyConversation(data.conversation);
      if (Array.isArray(data.messages)) {
        setMessages(
          [...data.messages].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
          ),
        );
      } else if (data.contactThankYou) {
        mergeMessages([data.contactThankYou]);
      }
      setContactSaved(true);
      try {
        sessionStorage.setItem(
          `vcruise-chat-contact-${conversation.id}`,
          "1",
        );
      } catch {
        // ignore
      }
    } catch {
      setContactError("Не вдалося зберегти. Спробуйте ще раз.");
    } finally {
      setContactBusy(false);
    }
  }

  async function sendMessage(rawText: string) {
    unlockChatSound();
    const value = rawText.trim();
    if ((!value && pendingFiles.length === 0) || sending) return;

    setSending(true);
    try {
      let active = conversation;
      if (!active) {
        active = await ensureSession();
      }
      if (!active) throw new Error("no_conversation");

      const attachments = await uploadPending(pendingFiles);
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: active.id,
          text: value,
          attachments,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "send_failed");

      mergeMessages([data.message]);
      if (data.autoReply) mergeMessages([data.autoReply]);
      if (data.conversation) applyConversation(data.conversation);
      setText("");
      pendingFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setPendingFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch {
      // keep draft for retry
    } finally {
      setSending(false);
    }
  }

  async function submitRating() {
    if (!conversation || ratingValue < 1 || ratingBusy) return;
    setRatingBusy(true);
    try {
      const response = await fetch("/api/chat/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          rating: ratingValue,
          comment: ratingComment,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "rating_failed");
      if (data.conversation) applyConversation(data.conversation);
      setRatingThanks(true);
      setUnread(0);
    } catch {
      // keep form for retry
    } finally {
      setRatingBusy(false);
    }
  }

  async function dismissRating() {
    if (!conversation || ratingBusy) return;
    setRatingBusy(true);
    try {
      const response = await fetch("/api/chat/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          dismiss: true,
        }),
      });
      const data = await response.json();
      if (data.conversation) applyConversation(data.conversation);
      setRatingValue(0);
      setRatingComment("");
    } finally {
      setRatingBusy(false);
    }
  }

  function renderAttachments(items: ChatAttachment[], visitor: boolean) {
    if (!items?.length) return null;
    const images = items.filter(isChatImage);
    const files = items.filter((item) => !isChatImage(item));

    return (
      <div className={styles.attachments}>
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
                aria-label={`Відкрити ${file.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={file.name}
                  loading="lazy"
                  decoding="async"
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
            className={`${styles.fileChip} ${
              visitor ? styles.fileChipVisitor : ""
            }`}
          >
            <span aria-hidden>📄</span>
            <span className={styles.fileChipName}>{file.name}</span>
          </a>
        ))}
      </div>
    );
  }

  if (isAdmin || !config?.enabled) return null;

  return (
    <div
      className={`${styles.root} ${styles.rootWithMessengers}`}
      onPointerDown={unlockChatSound}
    >
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Онлайн-чат">
          <header className={styles.header}>
            <div className={styles.headerIdentity}>
              <div className={styles.avatarWrap}>
                <AgentPhoto
                  src={agentImage}
                  alt={agentName}
                  className={styles.avatarPhoto}
                />
                <span className={styles.onlineDot} aria-hidden />
              </div>
              <div className={styles.headerCopy}>
                <p className={styles.headerTitle}>{agentName}</p>
                <p className={styles.headerStatus}>Онлайн · відповімо швидко</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Закрити чат"
              onClick={() => setOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className={styles.messages} ref={listRef}>
            {booting && messages.length === 0 ? (
              <p className={styles.typing}>Підключаємо чат…</p>
            ) : null}
            {messages.map((message) => {
              const isVisitor = message.role === "visitor";
              const isSystem = message.role === "system";
              const isAgent = !isVisitor && !isSystem;
              const hasText = Boolean(message.text?.trim());
              const rowClass = isVisitor
                ? styles.bubbleRowVisitor
                : isSystem
                  ? styles.bubbleRowSystem
                  : styles.bubbleRowAgent;
              const bubbleClass = isVisitor
                ? styles.bubbleVisitor
                : isSystem
                  ? styles.bubbleSystem
                  : styles.bubbleAgent;

              if (isSystem) {
                return (
                  <div
                    key={message.id}
                    className={`${styles.bubbleRow} ${rowClass}`}
                  >
                    <div className={`${styles.bubble} ${bubbleClass}`}>
                      {message.text}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`${styles.bubbleRow} ${rowClass}`}
                >
                  <div className={styles.bubbleWithPhoto}>
                    {isAgent ? (
                      <AgentPhoto
                        src={agentImage}
                        alt={agentName}
                        className={styles.msgPhoto}
                      />
                    ) : null}
                    <div className={styles.bubbleStack}>
                      {(hasText || message.attachments?.length) ? (
                        <div
                          className={`${styles.bubble} ${bubbleClass} ${
                            !hasText ? styles.bubbleMediaOnly : ""
                          }`}
                        >
                          {hasText ? message.text : null}
                          {renderAttachments(
                            message.attachments || [],
                            isVisitor
                          )}
                        </div>
                      ) : null}
                      <span className={styles.meta}>
                        {isVisitor
                          ? "Ви"
                          : message.authorName || agentName}{" "}
                        · {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {askRating || ratingThanks ? (
            <div className={styles.ratingCard}>
              {ratingThanks || conversation?.rating != null ? (
                <div className={styles.ratingThanks}>
                  <p className={styles.ratingTitle}>Дякуємо за оцінку!</p>
                  <p className={styles.ratingSub}>
                    Ваш відгук допомагає нам ставати кращими.
                  </p>
                </div>
              ) : (
                <>
                  <p className={styles.ratingTitle}>
                    {conversation?.ratingAskReason === "inactive"
                      ? "Як минула наша розмова?"
                      : "Оцініть якість консультації"}
                  </p>
                  <p className={styles.ratingSub}>
                    {conversation?.ratingAskReason === "inactive"
                      ? "Минуло кілька годин без повідомлень — будемо вдячні за коротку оцінку."
                      : "Діалог завершено. Поділіться враженням від спілкування."}
                  </p>
                  <div
                    className={styles.stars}
                    role="group"
                    aria-label="Оцінка від 1 до 5"
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (ratingHover || ratingValue) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          className={`${styles.star} ${
                            active ? styles.starActive : ""
                          }`}
                          aria-label={`${star} з 5`}
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          onClick={() => setRatingValue(star)}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    className={styles.ratingComment}
                    rows={2}
                    placeholder="Коментар (необов’язково)"
                    value={ratingComment}
                    onChange={(event) => setRatingComment(event.target.value)}
                  />
                  <div className={styles.ratingActions}>
                    <button
                      type="button"
                      className={styles.ratingSkip}
                      disabled={ratingBusy}
                      onClick={() => void dismissRating()}
                    >
                      Пізніше
                    </button>
                    <button
                      type="button"
                      className={styles.ratingSubmit}
                      disabled={ratingBusy || ratingValue < 1}
                      onClick={() => void submitRating()}
                    >
                      {ratingBusy ? "…" : "Надіслати"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {!chatClosed && !askRating ? (
            <>
              {needsContact ? (
                <div className={styles.contactCapture}>
                  <p className={styles.contactTitle}>
                    Залиште імʼя та телефон — менеджер зможе відповісти, навіть
                    якщо ви закриєте чат:
                  </p>
                  <div className={styles.contactFields}>
                    <input
                      className={styles.contactInput}
                      type="text"
                      autoComplete="name"
                      placeholder="Ваше імʼя *"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                    />
                    <input
                      className={styles.contactInput}
                      type="tel"
                      autoComplete="tel"
                      placeholder="Телефон *"
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                    />
                  </div>
                  {contactError ? (
                    <p className={styles.contactError}>{contactError}</p>
                  ) : null}
                  <button
                    type="button"
                    className={styles.contactSubmit}
                    disabled={contactBusy}
                    onClick={() => void saveContact()}
                  >
                    {contactBusy ? "…" : "Надіслати контакти"}
                  </button>
                </div>
              ) : null}

              {config.questions.length > 0 && !needsContact ? (
                <div className={styles.quick}>
                  {config.questions.map((question) => (
                    <button
                      key={question.id}
                      type="button"
                      className={styles.quickChip}
                      onClick={() => void sendMessage(question.text)}
                      disabled={sending}
                    >
                      {question.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={styles.composer}>
                {pendingFiles.length > 0 ? (
                  <div className={styles.pendingFiles}>
                    {pendingFiles.map((item) => (
                      <div key={item.id} className={styles.pendingCard}>
                        {item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.previewUrl}
                            alt=""
                            className={styles.pendingThumb}
                          />
                        ) : (
                          <span className={styles.pendingFileLabel}>
                            {item.file.name}
                          </span>
                        )}
                        <button
                          type="button"
                          className={styles.pendingRemove}
                          aria-label="Прибрати файл"
                          onClick={() => removePending(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className={styles.row}>
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(event) => {
                      addPendingFiles(Array.from(event.target.files || []));
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className={styles.attachBtn}
                    aria-label="Прикріпити файл"
                    disabled={sending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>
                  <textarea
                    ref={textareaRef}
                    className={styles.textarea}
                    rows={1}
                    placeholder="Напишіть повідомлення…"
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value);
                      const el = event.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage(text);
                      }
                    }}
                    onPaste={(event) => {
                      const files = Array.from(event.clipboardData.files || []);
                      if (files.length) {
                        event.preventDefault();
                        addPendingFiles(files);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.sendBtn}
                    aria-label="Надіслати"
                    disabled={
                      sending || (!text.trim() && pendingFiles.length === 0)
                    }
                    onClick={() => void sendMessage(text)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {chatClosed && !askRating && !ratingThanks && conversation?.rating == null ? (
            <div className={styles.composerClosed}>
              Діалог завершено. Якщо потрібна допомога — напишіть нам знову.
            </div>
          ) : null}
        </div>
      ) : null}

      {!open && teaserVisible ? (
        <div className={styles.teaser} role="status">
          <button
            type="button"
            className={styles.teaserBody}
            onClick={() => void handleOpen()}
          >
            <AgentPhoto
              src={agentImage}
              alt={agentName}
              className={styles.teaserPhoto}
            />
            <span className={styles.teaserCopy}>
              <span className={styles.teaserTitle}>Потрібна допомога?</span>
              <span className={styles.teaserSub}>
                Напишіть нам — підберемо круїз
              </span>
            </span>
          </button>
          <button
            type="button"
            className={styles.teaserClose}
            aria-label="Закрити підказку"
            onClick={dismissTeaser}
          >
            ×
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
        aria-label={open ? "Закрити чат" : "Відкрити онлайн-чат"}
        onClick={() => {
          if (open) setOpen(false);
          else void handleOpen();
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <AgentPhoto
            src={agentImage}
            alt={agentName}
            className={styles.launcherPhoto}
          />
        )}
        {!open && unread > 0 ? (
          <span className={styles.launcherBadge}>
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {lightbox ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Перегляд фото"
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
    </div>
  );
}
