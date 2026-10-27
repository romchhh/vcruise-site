import {
  getCmsSqlite,
  isCmsBuildPhase,
  readDb,
  uid,
  updateDb,
  type SiteSettings,
} from "./store";
import { publishChatEvent } from "./chat-events";

export type ChatAttachment = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

export type ChatMessageRole = "visitor" | "agent" | "system";

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  text: string;
  attachments: ChatAttachment[];
  createdAt: string;
  authorName?: string;
};

export type ChatConversationStatus = "open" | "closed";

export type ChatRatingAskReason = "closed" | "inactive";

export type ChatConversation = {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorPhone: string;
  page: string;
  status: ChatConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastPreview: string;
  unreadByAgent: number;
  unreadByVisitor: number;
  /** 1–5 when visitor rated the dialog. */
  rating?: number | null;
  ratingComment?: string;
  ratedAt?: string | null;
  /** Why the visitor should see the rating prompt. */
  ratingAskReason?: ChatRatingAskReason | null;
  ratingDismissedAt?: string | null;
};

/** Ask for a rating after this many hours without new messages. */
export const CHAT_INACTIVITY_HOURS = 3;

export type ChatPresetKind = "visitor_question" | "agent_reply";

export type ChatPreset = {
  id: string;
  kind: ChatPresetKind;
  label: string;
  text: string;
  sortOrder: number;
  active: boolean;
};

const VISITOR_COOKIE = "vcruise_chat_visitor";

export { VISITOR_COOKIE };

export const CHAT_VISITOR_AUTO_ACK =
  "Дякуємо за звернення! Менеджер звʼяжеться з вами найближчим часом. За потреби залиште імʼя та номер телефону в чаті.";

function defaultPresets(): ChatPreset[] {
  return [
    {
      id: "q-pick-cruise",
      kind: "visitor_question",
      label: "Підібрати круїз",
      text: "Хочу підібрати круїз. Підкажіть, будь ласка, варіанти за датами та бюджетом.",
      sortOrder: 1,
      active: true,
    },
    {
      id: "q-book-cruise",
      kind: "visitor_question",
      label: "Забронювати круїз",
      text: "Хочу забронювати круїз. Допоможіть з оформленням та наявністю кают.",
      sortOrder: 2,
      active: true,
    },
    {
      id: "q-visa-pick",
      kind: "visitor_question",
      label: "Підбір візи",
      text: "Потрібна допомога з підбором візи для круїзної подорожі.",
      sortOrder: 3,
      active: true,
    },
    {
      id: "q-consult",
      kind: "visitor_question",
      label: "Консультація",
      text: "Потрібна консультація щодо круїзної подорожі.",
      sortOrder: 4,
      active: true,
    },
    {
      id: "a-hello",
      kind: "agent_reply",
      label: "Вітання",
      text: "Доброго дня! Дякуємо, що звернулися до VCRUISE. Зараз подивлюся варіанти під ваш запит.",
      sortOrder: 1,
      active: true,
    },
    {
      id: "a-wait",
      kind: "agent_reply",
      label: "Хвилинку",
      text: "Зачекайте, будь ласка, кілька хвилин — уточнюю актуальну наявність і ціни.",
      sortOrder: 2,
      active: true,
    },
    {
      id: "a-contacts",
      kind: "agent_reply",
      label: "Контакти",
      text: "Можете залишити ім'я та номер телефону — надішлю добірку варіантів у зручний месенджер.",
      sortOrder: 3,
      active: true,
    },
    {
      id: "a-thanks",
      kind: "agent_reply",
      label: "Подяка",
      text: "Дякуємо за звернення! Якщо з'являться ще питання — пишіть у цей чат у будь-який час.",
      sortOrder: 4,
      active: true,
    },
  ];
}

function ensurePresetsSeeded() {
  if (isCmsBuildPhase()) return;
  const db = getCmsSqlite();
  const row = db.prepare(`SELECT COUNT(*) as count FROM chat_presets`).get() as {
    count: number;
  };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO chat_presets (id, kind, sort_order, data, updated_at)
     VALUES (@id, @kind, @sort_order, @data, @updated_at)`
  );
  const tx = db.transaction(() => {
    for (const preset of defaultPresets()) {
      stmt.run({
        id: preset.id,
        kind: preset.kind,
        sort_order: preset.sortOrder,
        data: JSON.stringify(preset),
        updated_at: now,
      });
    }
  });
  tx();
  syncVisitorQuickPresets();
}

const LEGACY_VISITOR_PRESET_IDS = [
  "q-price",
  "q-dates",
  "q-visa",
  "q-cabin",
];

/** Оновлює швидкі кнопки чату (нові підписи) без зміни агентських шаблонів. */
export function syncVisitorQuickPresets() {
  if (isCmsBuildPhase()) return;
  const db = getCmsSqlite();
  const seeded = db
    .prepare(`SELECT COUNT(*) as count FROM chat_presets`)
    .get() as { count: number };
  if (!seeded.count) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO chat_presets (id, kind, sort_order, data, updated_at)
     VALUES (@id, @kind, @sort_order, @data, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       kind = excluded.kind,
       sort_order = excluded.sort_order,
       data = excluded.data,
       updated_at = excluded.updated_at`,
  );

  const visitorButtons = defaultPresets().filter(
    (preset) => preset.kind === "visitor_question",
  );

  const tx = db.transaction(() => {
    for (const preset of visitorButtons) {
      stmt.run({
        id: preset.id,
        kind: preset.kind,
        sort_order: preset.sortOrder,
        data: JSON.stringify(preset),
        updated_at: now,
      });
    }

    for (const legacyId of LEGACY_VISITOR_PRESET_IDS) {
      const row = db
        .prepare(`SELECT data FROM chat_presets WHERE id = ?`)
        .get(legacyId) as { data: string } | undefined;
      if (!row) continue;
      const parsed = JSON.parse(row.data) as ChatPreset;
      if (!parsed.active) continue;
      const next = { ...parsed, active: false };
      db.prepare(
        `UPDATE chat_presets SET data = @data, updated_at = @updated_at WHERE id = @id`,
      ).run({
        id: legacyId,
        data: JSON.stringify(next),
        updated_at: now,
      });
    }
  });
  tx();
}

export function maybeSendVisitorAutoAck(conversationId: string) {
  const conversation = getConversation(conversationId);
  if (!conversation || conversation.status === "closed") return null;

  const messages = listMessages(conversationId);
  const hasAgentReply = messages.some((item) => item.role === "agent");
  const alreadyAcked = messages.some(
    (item) =>
      item.role === "agent" && item.text.includes("Менеджер звʼяжеться"),
  );
  if (hasAgentReply || alreadyAcked) return null;

  const settings = getChatSettings();
  return addMessage({
    conversationId,
    role: "agent",
    text: CHAT_VISITOR_AUTO_ACK,
    authorName: settings.chatAgentName,
  });
}

const DEFAULT_AGENT_IMAGE = "/images/chat-assistant.jpg";

export type ChatOperator = {
  id: string;
  name: string;
  image: string;
  sortOrder: number;
};

function parseOperator(data: string): ChatOperator {
  return JSON.parse(data) as ChatOperator;
}

function ensureOperatorsSeeded() {
  if (isCmsBuildPhase()) return;
  const db = getCmsSqlite();
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM chat_operators`)
    .get() as { c: number };
  if (row.c > 0) return;

  const settings = readDb().settings;
  const operator: ChatOperator = {
    id: uid("op"),
    name: settings.chatAgentName || "Консультант VCRUISE",
    image: settings.chatAgentImage || DEFAULT_AGENT_IMAGE,
    sortOrder: 1,
  };
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_operators (id, sort_order, data, updated_at)
     VALUES (@id, @sort_order, @data, @updated_at)`
  ).run({
    id: operator.id,
    sort_order: operator.sortOrder,
    data: JSON.stringify(operator),
    updated_at: now,
  });

  updateDb((state) => {
    if (!state.settings.chatActiveOperatorId) {
      state.settings.chatActiveOperatorId = operator.id;
    }
  });
}

export function listChatOperators(): ChatOperator[] {
  if (isCmsBuildPhase()) return [];
  ensureOperatorsSeeded();
  const db = getCmsSqlite();
  const rows = db
    .prepare(`SELECT data FROM chat_operators ORDER BY sort_order ASC`)
    .all() as Array<{ data: string }>;
  return rows.map((row) => parseOperator(row.data));
}

export function getActiveChatOperatorId(): string | null {
  if (isCmsBuildPhase()) return null;
  ensureOperatorsSeeded();
  const settings = readDb().settings;
  if (settings.chatActiveOperatorId) return settings.chatActiveOperatorId;
  return listChatOperators()[0]?.id ?? null;
}

function getActiveChatOperator(): ChatOperator {
  const settings = readDb().settings;
  if (isCmsBuildPhase()) {
    return {
      id: "build",
      name: settings.chatAgentName || "Консультант VCRUISE",
      image: settings.chatAgentImage || DEFAULT_AGENT_IMAGE,
      sortOrder: 1,
    };
  }
  ensureOperatorsSeeded();
  const operators = listChatOperators();
  const activeId = settings.chatActiveOperatorId;
  const active = activeId
    ? operators.find((item) => item.id === activeId)
    : undefined;
  if (active) return active;
  if (operators[0]) return operators[0];
  return {
    id: "legacy",
    name: settings.chatAgentName || "Консультант VCRUISE",
    image: settings.chatAgentImage || DEFAULT_AGENT_IMAGE,
    sortOrder: 1,
  };
}

export function saveChatOperators(payload: {
  operators: ChatOperator[];
  activeOperatorId: string;
}): { operators: ChatOperator[]; activeOperatorId: string } {
  if (isCmsBuildPhase()) {
    return { operators: [], activeOperatorId: "" };
  }
  ensureOperatorsSeeded();

  const idMap = new Map<string, string>();
  const cleaned = payload.operators
    .map((item, index) => {
      const needsNewId =
        !item.id || item.id.startsWith("tmp-");
      const id = needsNewId ? uid("op") : item.id;
      if (item.id) idMap.set(item.id, id);
      return {
        id,
        name: item.name.trim(),
        image: (item.image || "").trim() || DEFAULT_AGENT_IMAGE,
        sortOrder: item.sortOrder ?? index + 1,
      };
    })
    .filter((item) => item.name.length > 0);

  if (cleaned.length === 0) {
    throw new Error("need_one_operator");
  }

  let activeId =
    idMap.get(payload.activeOperatorId) || payload.activeOperatorId;
  if (!cleaned.some((item) => item.id === activeId)) {
    activeId = cleaned[0].id;
  }
  const active = cleaned.find((item) => item.id === activeId)!;

  const db = getCmsSqlite();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM chat_operators`).run();
    const insert = db.prepare(
      `INSERT INTO chat_operators (id, sort_order, data, updated_at)
       VALUES (@id, @sort_order, @data, @updated_at)`
    );
    for (const operator of cleaned) {
      insert.run({
        id: operator.id,
        sort_order: operator.sortOrder,
        data: JSON.stringify(operator),
        updated_at: now,
      });
    }
  });
  tx();

  updateDb((state) => {
    state.settings.chatActiveOperatorId = activeId;
    state.settings.chatAgentName = active.name;
    state.settings.chatAgentImage = active.image;
  });

  return { operators: cleaned, activeOperatorId: activeId };
}

export function getChatSettings(): Pick<
  SiteSettings,
  | "chatEnabled"
  | "chatWelcomeMessage"
  | "chatAgentName"
  | "chatAgentImage"
  | "chatOfflineMessage"
  | "brandName"
> {
  const settings = readDb().settings;
  const operator = getActiveChatOperator();
  return {
    chatEnabled: settings.chatEnabled !== false,
    chatWelcomeMessage: settings.chatWelcomeMessage,
    chatAgentName: operator.name,
    chatAgentImage: operator.image || DEFAULT_AGENT_IMAGE,
    chatOfflineMessage: settings.chatOfflineMessage,
    brandName: settings.brandName,
  };
}

function parseConversation(data: string): ChatConversation {
  return JSON.parse(data) as ChatConversation;
}

function parseMessage(data: string): ChatMessage {
  const message = JSON.parse(data) as ChatMessage;
  return {
    ...message,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  };
}

export function listConversations(): ChatConversation[] {
  if (isCmsBuildPhase()) return [];
  ensurePresetsSeeded();
  const db = getCmsSqlite();
  const rows = db
    .prepare(
      `SELECT data FROM chat_conversations ORDER BY last_message_at DESC`
    )
    .all() as Array<{ data: string }>;
  return rows.map((row) => parseConversation(row.data));
}

export function getConversation(id: string): ChatConversation | null {
  if (isCmsBuildPhase()) return null;
  const db = getCmsSqlite();
  const row = db
    .prepare(`SELECT data FROM chat_conversations WHERE id = ?`)
    .get(id) as { data: string } | undefined;
  return row ? parseConversation(row.data) : null;
}

export function getConversationByVisitor(
  visitorId: string
): ChatConversation | null {
  if (isCmsBuildPhase()) return null;
  const db = getCmsSqlite();
  const open = db
    .prepare(
      `SELECT data FROM chat_conversations
       WHERE visitor_id = ? AND json_extract(data, '$.status') = 'open'
       ORDER BY last_message_at DESC LIMIT 1`
    )
    .get(visitorId) as { data: string } | undefined;
  if (open) return syncRatingPrompt(parseConversation(open.data));

  const latest = db
    .prepare(
      `SELECT data FROM chat_conversations
       WHERE visitor_id = ?
       ORDER BY last_message_at DESC LIMIT 1`
    )
    .get(visitorId) as { data: string } | undefined;
  if (!latest) return null;
  const conversation = syncRatingPrompt(parseConversation(latest.data));
  return conversationNeedsRating(conversation) ? conversation : null;
}

function saveConversation(conversation: ChatConversation) {
  const db = getCmsSqlite();
  db.prepare(
    `INSERT INTO chat_conversations
      (id, visitor_id, data, created_at, updated_at, last_message_at)
     VALUES (@id, @visitor_id, @data, @created_at, @updated_at, @last_message_at)
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at,
       last_message_at = excluded.last_message_at`
  ).run({
    id: conversation.id,
    visitor_id: conversation.visitorId,
    data: JSON.stringify(conversation),
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
    last_message_at: conversation.lastMessageAt,
  });
}

function patchConversation(
  id: string,
  patch: Partial<ChatConversation>,
  options?: { silent?: boolean }
): ChatConversation | null {
  const current = getConversation(id);
  if (!current) return null;
  const next: ChatConversation = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveConversation(next);
  if (!options?.silent) {
    publishChatEvent({
      type: "conversation",
      conversationId: id,
      at: next.updatedAt,
    });
  }
  return next;
}

export function createConversation(input: {
  visitorId: string;
  page?: string;
  visitorName?: string;
  visitorPhone?: string;
}): ChatConversation {
  ensurePresetsSeeded();
  const now = new Date().toISOString();
  const settings = getChatSettings();
  const conversation: ChatConversation = {
    id: uid("chat"),
    visitorId: input.visitorId,
    visitorName: input.visitorName?.trim() || "",
    visitorPhone: input.visitorPhone?.trim() || "",
    page: input.page?.trim() || "/",
    status: "open",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastPreview: settings.chatWelcomeMessage.slice(0, 120),
    unreadByAgent: 0,
    unreadByVisitor: 0,
  };

  const welcome: ChatMessage = {
    id: uid("msg"),
    conversationId: conversation.id,
    role: "system",
    text: settings.chatWelcomeMessage,
    attachments: [],
    createdAt: now,
    authorName: settings.chatAgentName,
  };

  const db = getCmsSqlite();
  const tx = db.transaction(() => {
    saveConversation(conversation);
    db.prepare(
      `INSERT INTO chat_messages (id, conversation_id, created_at, data)
       VALUES (@id, @conversation_id, @created_at, @data)`
    ).run({
      id: welcome.id,
      conversation_id: welcome.conversationId,
      created_at: welcome.createdAt,
      data: JSON.stringify(welcome),
    });
  });
  tx();

  publishChatEvent({
    type: "conversation",
    conversationId: conversation.id,
    at: now,
  });
  publishChatEvent({
    type: "message",
    conversationId: conversation.id,
    at: now,
    messageId: welcome.id,
    role: "system",
  });

  return conversation;
}

export function updateConversation(
  id: string,
  patch: Partial<
    Pick<
      ChatConversation,
      | "visitorName"
      | "visitorPhone"
      | "status"
      | "unreadByAgent"
      | "unreadByVisitor"
      | "lastPreview"
      | "lastMessageAt"
      | "rating"
      | "ratingComment"
      | "ratedAt"
      | "ratingAskReason"
      | "ratingDismissedAt"
    >
  >,
  options?: { silent?: boolean }
): ChatConversation | null {
  return patchConversation(id, patch, options);
}

export function conversationNeedsRating(conversation: ChatConversation) {
  return conversation.rating == null && Boolean(conversation.ratingAskReason);
}

function isInactiveForRating(conversation: ChatConversation) {
  const last = Date.parse(conversation.lastMessageAt);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last >= CHAT_INACTIVITY_HOURS * 60 * 60 * 1000;
}

/** Persist rating prompt flags for closed / long-idle chats (no SSE storm). */
export function syncRatingPrompt(
  conversation: ChatConversation
): ChatConversation {
  if (conversation.rating != null) return conversation;

  if (conversation.status === "closed") {
    if (conversation.ratingAskReason === "closed") return conversation;
    return (
      updateConversation(
        conversation.id,
        { ratingAskReason: "closed" },
        { silent: true }
      ) || conversation
    );
  }

  if (conversation.ratingAskReason) return conversation;
  if (conversation.ratingDismissedAt) return conversation;
  if (!isInactiveForRating(conversation)) return conversation;

  return (
    updateConversation(
      conversation.id,
      { ratingAskReason: "inactive" },
      { silent: true }
    ) || conversation
  );
}

export function closeConversation(id: string): ChatConversation | null {
  const current = getConversation(id);
  if (!current) return null;
  if (current.status === "closed") {
    if (current.rating == null && current.ratingAskReason !== "closed") {
      return (
        updateConversation(id, { ratingAskReason: "closed" }) || current
      );
    }
    return current;
  }
  return updateConversation(id, {
    status: "closed",
    ...(current.rating == null ? { ratingAskReason: "closed" as const } : {}),
  });
}

export function submitConversationRating(input: {
  conversationId: string;
  visitorId: string;
  rating: number;
  comment?: string;
}): ChatConversation | null {
  const conversation = getConversation(input.conversationId);
  if (!conversation || conversation.visitorId !== input.visitorId) return null;
  if (conversation.rating != null) return conversation;

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) return null;

  return updateConversation(input.conversationId, {
    rating,
    ratingComment: (input.comment || "").trim().slice(0, 500),
    ratedAt: new Date().toISOString(),
    ratingAskReason: null,
  });
}

export function dismissConversationRating(input: {
  conversationId: string;
  visitorId: string;
}): ChatConversation | null {
  const conversation = getConversation(input.conversationId);
  if (!conversation || conversation.visitorId !== input.visitorId) return null;
  if (conversation.rating != null) return conversation;

  return updateConversation(input.conversationId, {
    ratingAskReason: null,
    ratingDismissedAt: new Date().toISOString(),
  });
}

export function getChatRatingStats() {
  const conversations = listConversations().filter(
    (item) => typeof item.rating === "number" && item.rating >= 1
  );
  if (conversations.length === 0) {
    return { count: 0, average: null as number | null, recent: [] as ChatConversation[] };
  }
  const sum = conversations.reduce((acc, item) => acc + (item.rating || 0), 0);
  const recent = [...conversations]
    .sort((a, b) => (b.ratedAt || "").localeCompare(a.ratedAt || ""))
    .slice(0, 8);
  return {
    count: conversations.length,
    average: Math.round((sum / conversations.length) * 10) / 10,
    recent,
  };
}

export function listMessages(
  conversationId: string,
  after?: string
): ChatMessage[] {
  if (isCmsBuildPhase()) return [];
  const db = getCmsSqlite();
  if (after) {
    const rows = db
      .prepare(
        `SELECT data FROM chat_messages
         WHERE conversation_id = ? AND created_at > ?
         ORDER BY created_at ASC`
      )
      .all(conversationId, after) as Array<{ data: string }>;
    return rows.map((row) => parseMessage(row.data));
  }

  const rows = db
    .prepare(
      `SELECT data FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
    .all(conversationId) as Array<{ data: string }>;
  return rows.map((row) => parseMessage(row.data));
}

export function addMessage(input: {
  conversationId: string;
  role: ChatMessageRole;
  text: string;
  attachments?: ChatAttachment[];
  authorName?: string;
}): ChatMessage | null {
  const conversation = getConversation(input.conversationId);
  if (!conversation || conversation.status === "closed") return null;

  const now = new Date().toISOString();
  const text = input.text.trim();
  const attachments = input.attachments ?? [];
  if (!text && attachments.length === 0) return null;

  const message: ChatMessage = {
    id: uid("msg"),
    conversationId: input.conversationId,
    role: input.role,
    text,
    attachments,
    createdAt: now,
    authorName: input.authorName,
  };

  const preview =
    text.slice(0, 120) ||
    (attachments[0] ? `📎 ${attachments[0].name}` : "Нове повідомлення");

  const nextConversation: ChatConversation = {
    ...conversation,
    updatedAt: now,
    lastMessageAt: now,
    lastPreview: preview,
    unreadByAgent:
      input.role === "visitor"
        ? conversation.unreadByAgent + 1
        : conversation.unreadByAgent,
    unreadByVisitor:
      input.role === "agent" || input.role === "system"
        ? conversation.unreadByVisitor + 1
        : conversation.unreadByVisitor,
  };

  const db = getCmsSqlite();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO chat_messages (id, conversation_id, created_at, data)
       VALUES (@id, @conversation_id, @created_at, @data)`
    ).run({
      id: message.id,
      conversation_id: message.conversationId,
      created_at: message.createdAt,
      data: JSON.stringify(message),
    });
    saveConversation(nextConversation);
  });
  tx();

  publishChatEvent({
    type: "message",
    conversationId: message.conversationId,
    at: now,
    messageId: message.id,
    role: message.role,
  });

  return message;
}

export function markConversationRead(
  conversationId: string,
  who: "agent" | "visitor"
) {
  const conversation = getConversation(conversationId);
  if (!conversation) return null;
  return updateConversation(conversationId, {
    unreadByAgent: who === "agent" ? 0 : conversation.unreadByAgent,
    unreadByVisitor: who === "visitor" ? 0 : conversation.unreadByVisitor,
  });
}

export function countUnreadForAgent() {
  return listConversations().reduce(
    (sum, conversation) => sum + (conversation.unreadByAgent || 0),
    0
  );
}

export function listPresets(kind?: ChatPresetKind): ChatPreset[] {
  if (isCmsBuildPhase()) {
    return kind
      ? defaultPresets().filter((preset) => preset.kind === kind)
      : defaultPresets();
  }
  ensurePresetsSeeded();
  if (!kind || kind === "visitor_question") {
    syncVisitorQuickPresets();
  }
  const db = getCmsSqlite();
  const rows = (
    kind
      ? db
          .prepare(
            `SELECT data FROM chat_presets WHERE kind = ? ORDER BY sort_order ASC`
          )
          .all(kind)
      : db
          .prepare(`SELECT data FROM chat_presets ORDER BY kind, sort_order ASC`)
          .all()
  ) as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as ChatPreset);
}

export function savePreset(preset: ChatPreset): ChatPreset {
  ensurePresetsSeeded();
  const db = getCmsSqlite();
  const now = new Date().toISOString();
  const next = { ...preset, id: preset.id || uid("preset") };
  db.prepare(
    `INSERT INTO chat_presets (id, kind, sort_order, data, updated_at)
     VALUES (@id, @kind, @sort_order, @data, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       kind = excluded.kind,
       sort_order = excluded.sort_order,
       data = excluded.data,
       updated_at = excluded.updated_at`
  ).run({
    id: next.id,
    kind: next.kind,
    sort_order: next.sortOrder,
    data: JSON.stringify(next),
    updated_at: now,
  });
  return next;
}

export function deletePreset(id: string) {
  if (isCmsBuildPhase()) return;
  const db = getCmsSqlite();
  db.prepare(`DELETE FROM chat_presets WHERE id = ?`).run(id);
}
