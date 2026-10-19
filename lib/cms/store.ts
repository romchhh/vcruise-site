import fs from "fs";
import path from "path";
import type BetterSqlite3 from "better-sqlite3";
import { aboutFeatures } from "@/data/about";
import { siteConfig } from "@/lib/site";

export type LeadStatus = "new" | "in_progress" | "done" | "archived";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  /** Liner/company summary. */
  cruise: string;
  status: LeadStatus;
  notes: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
  /** Page URL when the lead was submitted. */
  page?: string;
  booking?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};

export type AdminUser = {
  id: string;
  login: string;
  password: string;
  name: string;
  roleId: string;
  active: boolean;
};

export type SiteSettings = {
  brandName: string;
  legalName: string;
  domain: string;
  email: string;
  phone: string;
  phoneDisplay: string;
  address: string;
  city: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTelegram: string;
  telegramUsername: string;
  socialViber: string;
  metaTitle: string;
  metaDescription: string;
  telegramNotify: boolean;
  /** Online chat widget on the public site. */
  chatEnabled: boolean;
  chatWelcomeMessage: string;
  chatAgentName: string;
  chatAgentImage: string;
  chatOfflineMessage: string;
};

export type ContentBlockKey =
  | "hero"
  | "hot-deals"
  | "unique-routes"
  | "liner-classes"
  | "destinations"
  | "cruise-finder"
  | "package-tours"
  | "about"
  | "cta";

export type ContentBlockFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type ContentBlock = {
  id: string;
  key: ContentBlockKey;
  label: string;
  badge: string;
  title: string;
  titleLine2: string;
  description: string;
  paragraphs: string[];
  image: string;
  imageAlt: string;
  images: string[];
  ctaLabel: string;
  ctaHref: string;
  features: ContentBlockFeature[];
  sortOrder: number;
};

export type SyncRunStatus = "running" | "success" | "error";

export type SyncRun = {
  id: string;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt?: string;
  cruiseCount?: number;
  message?: string;
  logTail?: string;
  triggeredBy: "admin" | "scheduler" | "cli";
};

export type CmsDb = {
  leads: Lead[];
  blocks: ContentBlock[];
  syncRuns: SyncRun[];
  roles: AdminRole[];
  users: AdminUser[];
  settings: SiteSettings;
};

export type AdminSessionRecord = {
  token: string;
  userId: string;
  login: string;
  roleId: string;
  createdAt: string;
  expiresAt: string;
};

const DATA_DIR =
  process.env.CMS_DATA_DIR || path.join(process.cwd(), "cms-data");
const SQLITE_FILE = path.join(DATA_DIR, "vcruise.sqlite");

/** Keep the sync history table from growing without bound. */
const MAX_SYNC_RUNS = 100;

type SqliteDatabase = BetterSqlite3.Database;

declare global {
  var __vcruiseSqlite: SqliteDatabase | undefined;
  var __vcruiseBuildDb: CmsDb | undefined;
}

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function loadSqlite(): typeof BetterSqlite3 {
  // Lazy-load so Next build workers do not dlopen the native addon unless needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("better-sqlite3") as typeof BetterSqlite3;
}

function defaultBlocks(): ContentBlock[] {
  const empty = {
    badge: "",
    title: "",
    titleLine2: "",
    description: "",
    paragraphs: [] as string[],
    image: "",
    imageAlt: "",
    images: [] as string[],
    ctaLabel: "",
    ctaHref: "",
    features: [] as ContentBlockFeature[],
  };

  const blocks: Array<
    Omit<ContentBlock, "id" | "sortOrder"> & { key: ContentBlockKey }
  > = [
    {
      ...empty,
      key: "hero",
      label: "Hero",
      title: "Відкрийте океан",
      titleLine2: "можливостей",
      description:
        "Подорожуйте без зайвих турбот – ми будемо поруч на кожному етапі.",
      image: "/images/hero.jpg",
      imageAlt: "Круїзний лайнер на заході сонця",
    },
    {
      ...empty,
      key: "hot-deals",
      label: "Гарячі пропозиції",
      badge: "Найкращі пропозиції",
      title: "Найближчі маршрути за спеціальною ціною",
      description:
        "Зібрали найближчі круїзи зі спеціальними цінами в одному місці. Обирайте маршрут, який підходить за датами, напрямком і бюджетом, — а про решту подбаємо ми.",
    },
    {
      ...empty,
      key: "unique-routes",
      label: "Унікальні маршрути",
      badge: "Унікальні маршрути",
      title: "Маршрути поза звичними сценаріями",
      description:
        "Ретельно відібрані маршрути для тих, хто шукає не стандартну відпустку, а особливий досвід. Більше напрямків, незвичні порти та подорожі, які залишаються в пам'яті надовго.",
    },
    {
      ...empty,
      key: "liner-classes",
      label: "Класи лайнерів",
      badge: "Класи лайнерів",
      title: "Оберіть свій клас лайнера",
      description:
        "Не всі лайнери однакові: від мегалайнерів з аквапарками до камерних преміальних суден. Ми допоможемо зрозуміти відмінності та обрати формат подорожі саме для вас.",
    },
    {
      ...empty,
      key: "destinations",
      label: "Популярні напрямки",
      badge: "Найпопулярніші напрямки",
      title: "Ваш наступний маршрут може бути тут",
      description:
        "Добірка актуальних круїзів на найближчі дати. Обирайте напрямок, лайнер або формат подорожі — допоможемо розібратися в деталях і підібрати найкращий варіант.",
    },
    {
      ...empty,
      key: "cruise-finder",
      label: "Підбір круїзу",
      badge: "Підібрати круїз",
      title: "Не знаєте, який круїз обрати?",
      titleLine2: "Ми підберемо його за вас",
      description:
        "Розкажіть трохи про свою майбутню подорож — ми підберемо варіанти відповідно до ваших побажань, бюджету та формату відпочинку.",
      image: "/images/cruise-finder.jpg",
      ctaLabel: "Підібрати круїз",
    },
    {
      ...empty,
      key: "package-tours",
      label: "Пакетні тури",
      badge: "Пакетні тури",
      title: "Подорожі, створені під вас",
      description:
        "Не тільки круїзи. Ми створюємо готові пакетні тури, поєднуючи готелі, перельоти, трансфери, екскурсії та інші послуги в одну комфортну подорож.",
    },
    {
      ...empty,
      key: "about",
      label: "Про нас",
      badge: "Про нас",
      title: "Ми знаємо круїзи не тільки з каталогів",
      paragraphs: [
        "За нашим досвідом — робота у 4 великих круїзних туроператорах. За цей час ми побачили індустрію зсередини: як працюють компанії, що важливо клієнтам, де найчастіше виникають труднощі та що насправді робить подорож комфортною.",
        "Саме тому сьогодні ми не просто продаємо круїзи. Ми допомагаємо організувати подорож від першого запиту до повернення додому.",
      ],
      image: "/images/about-us.jpg",
      imageAlt: "Круїзний лайнер серед зелені та гір",
      features: aboutFeatures.map((feature) => ({
        id: feature.id,
        title: feature.title,
        description: feature.description,
        icon: feature.icon,
      })),
    },
    {
      ...empty,
      key: "cta",
      label: "Заклик до дії",
      badge: "Ви подорожуєте",
      title: "Ми подбаємо про все інше",
      description:
        "Від вибору маршруту та каюти до документів, екскурсій і підтримки під час подорожі.",
      images: ["/images/cta-ship.jpg", "/images/cta-deck.jpg"],
      ctaLabel: "Підібрати круїз",
      ctaHref: "#cruise-finder",
    },
  ];

  return blocks.map((block, index) => ({
    ...block,
    id: `block-${block.key}`,
    sortOrder: index + 1,
  }));
}

function defaultSettings(): SiteSettings {
  return {
    brandName: siteConfig.name,
    legalName: siteConfig.legalName,
    domain: "vcruise.ua",
    email: siteConfig.email,
    phone: siteConfig.phone,
    phoneDisplay: siteConfig.phoneDisplay,
    address: siteConfig.address.streetAddress,
    city: siteConfig.address.addressLocality,
    socialInstagram: siteConfig.social.instagram,
    socialFacebook: siteConfig.social.facebook,
    socialTelegram:
      siteConfig.messengers.telegram ||
      `https://t.me/${siteConfig.messengers.telegramUsername || "vcruise"}`,
    telegramUsername: siteConfig.messengers.telegramUsername || "vcruise",
    socialViber: siteConfig.messengers.viber,
    metaTitle: siteConfig.title,
    metaDescription: siteConfig.description,
    telegramNotify: true,
    chatEnabled: true,
    chatWelcomeMessage:
      "Вітаємо у VCRUISE! Напишіть, чим можемо допомогти з круїзом — відповімо якнайшвидше.",
    chatAgentName: "Консультант VCRUISE",
    chatAgentImage: "/images/chat-assistant.jpg",
    chatOfflineMessage:
      "Зараз ми офлайн. Залиште повідомлення — відповімо в робочий час.",
  };
}

function defaultRoles(): AdminRole[] {
  return [
    {
      id: "owner",
      name: "Власник",
      description: "Повний доступ до всіх розділів.",
      permissions: [
        "dashboard",
        "leads",
        "content",
        "chat",
        "sync",
        "settings",
      ],
    },
  ];
}

function defaultUsers(): AdminUser[] {
  return [
    {
      id: "user-admin",
      login: process.env.ADMIN_LOGIN || "admin",
      password: process.env.ADMIN_PASSWORD || "vcruise2025",
      name: "Адміністратор",
      roleId: "owner",
      active: true,
    },
  ];
}

function defaultDb(): CmsDb {
  return {
    leads: [],
    blocks: defaultBlocks(),
    syncRuns: [],
    roles: defaultRoles(),
    users: defaultUsers(),
    settings: defaultSettings(),
  };
}

function normalizeBlock(block: ContentBlock): ContentBlock {
  const fallback = defaultBlocks().find((entry) => entry.key === block.key);
  const merged: ContentBlock = { ...(fallback ?? block), ...block };
  return {
    ...merged,
    paragraphs: Array.isArray(merged.paragraphs) ? merged.paragraphs : [],
    images: Array.isArray(merged.images) ? merged.images : [],
    features: Array.isArray(merged.features) ? merged.features : [],
  };
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDb(): SqliteDatabase {
  if (isProductionBuild()) {
    throw new Error("SQLite is disabled during Next.js production build");
  }
  if (globalThis.__vcruiseSqlite) return globalThis.__vcruiseSqlite;

  ensureDir();
  const Database = loadSqlite();
  const db = new Database(SQLITE_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      login TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_presets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_chat_conv_visitor ON chat_conversations(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conv_last ON chat_conversations(last_message_at);
    CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_presets_kind ON chat_presets(kind, sort_order);
  `);

  globalThis.__vcruiseSqlite = db;
  ensureChatSchema(db);
  bootstrapIfNeeded(db);
  return db;
}

/** Safe to call on every boot — creates chat tables for DBs opened before chat existed. */
function ensureChatSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_presets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_conv_visitor ON chat_conversations(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conv_last ON chat_conversations(last_message_at);
    CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_presets_kind ON chat_presets(kind, sort_order);
  `);
}

function countRows(db: SqliteDatabase, table: string) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
    count: number;
  };
  return row.count;
}

function insertBlocks(db: SqliteDatabase, items: ContentBlock[], ignore = false) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT ${ignore ? "OR IGNORE " : ""}INTO blocks (id, key, data, updated_at)
     VALUES (@id, @key, @data, @updated_at)`
  );
  for (const item of items) {
    stmt.run({
      id: item.id,
      key: item.key,
      data: JSON.stringify(item),
      updated_at: now,
    });
  }
}

function insertLeads(db: SqliteDatabase, items: Lead[], ignore = false) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT ${ignore ? "OR IGNORE " : ""}INTO leads (id, data, created_at, updated_at)
     VALUES (@id, @data, @created_at, @updated_at)`
  );
  for (const item of items) {
    stmt.run({
      id: item.id,
      data: JSON.stringify(item),
      created_at: item.createdAt || now,
      updated_at: item.updatedAt || now,
    });
  }
}

function insertSyncRuns(db: SqliteDatabase, items: SyncRun[], ignore = false) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT ${ignore ? "OR IGNORE " : ""}INTO sync_runs (id, data, started_at, updated_at)
     VALUES (@id, @data, @started_at, @updated_at)`
  );
  for (const item of items) {
    stmt.run({
      id: item.id,
      data: JSON.stringify(item),
      started_at: item.startedAt || now,
      updated_at: now,
    });
  }
}

function insertRoles(db: SqliteDatabase, items: AdminRole[], ignore = false) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT ${ignore ? "OR IGNORE " : ""}INTO roles (id, data, updated_at)
     VALUES (@id, @data, @updated_at)`
  );
  for (const item of items) {
    stmt.run({
      id: item.id,
      data: JSON.stringify(item),
      updated_at: now,
    });
  }
}

function insertUsers(db: SqliteDatabase, items: AdminUser[], ignore = false) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT ${ignore ? "OR IGNORE " : ""}INTO users (id, login, data, updated_at)
     VALUES (@id, @login, @data, @updated_at)`
  );
  for (const item of items) {
    stmt.run({
      id: item.id,
      login: item.login,
      data: JSON.stringify(item),
      updated_at: now,
    });
  }
}

function writeSettings(db: SqliteDatabase, settings: SiteSettings) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO settings (id, data, updated_at) VALUES (1, @data, @updated_at)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).run({
    data: JSON.stringify(settings),
    updated_at: now,
  });
}

/**
 * Fills in anything missing without overwriting existing data:
 * new content blocks (matched by key), roles, users and settings.
 * Safe to run from several Next.js workers in parallel.
 */
function bootstrapIfNeeded(db: SqliteDatabase) {
  const defaults = defaultDb();

  const tx = db.transaction(() => {
    insertBlocks(db, defaults.blocks, true);

    if (countRows(db, "roles") === 0) {
      insertRoles(db, defaults.roles, true);
    }
    if (countRows(db, "users") === 0) {
      insertUsers(db, defaults.users, true);
    }
    if (countRows(db, "settings") === 0) {
      db.prepare(
        `INSERT OR IGNORE INTO settings (id, data, updated_at) VALUES (1, @data, @updated_at)`
      ).run({
        data: JSON.stringify(defaults.settings),
        updated_at: new Date().toISOString(),
      });
    }

    db.prepare(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')`
    ).run();
  });

  try {
    tx();
  } catch {
    // Another worker may have seeded the database in parallel.
  }
}

function readCollection<T>(
  db: SqliteDatabase,
  table: string,
  orderBy = "rowid ASC"
): T[] {
  const rows = db
    .prepare(`SELECT data FROM ${table} ORDER BY ${orderBy}`)
    .all() as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as T);
}

function sortBlocks(blocks: ContentBlock[]) {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function readDb(): CmsDb {
  if (isProductionBuild()) {
    if (!globalThis.__vcruiseBuildDb) {
      globalThis.__vcruiseBuildDb = defaultDb();
    }
    return globalThis.__vcruiseBuildDb;
  }

  const db = getDb();
  const defaults = defaultDb();
  const settingsRow = db
    .prepare(`SELECT data FROM settings WHERE id = 1`)
    .get() as { data: string } | undefined;

  const storedBlocks = readCollection<ContentBlock>(db, "blocks").map(
    normalizeBlock
  );
  const storedKeys = new Set(storedBlocks.map((block) => block.key));
  const blocks = sortBlocks([
    ...storedBlocks,
    ...defaults.blocks.filter((block) => !storedKeys.has(block.key)),
  ]);

  const roles = readCollection<AdminRole>(db, "roles");
  const users = readCollection<AdminUser>(db, "users");

  return {
    leads: readCollection<Lead>(db, "leads"),
    blocks,
    syncRuns: readCollection<SyncRun>(db, "sync_runs", "started_at DESC"),
    roles: roles.length ? roles : defaults.roles,
    users: users.length ? users : defaults.users,
    settings: settingsRow
      ? {
          ...defaults.settings,
          ...(JSON.parse(settingsRow.data) as Partial<SiteSettings>),
        }
      : defaults.settings,
  };
}

export function writeDb(cms: CmsDb) {
  if (isProductionBuild()) {
    globalThis.__vcruiseBuildDb = cms;
    return;
  }

  const db = getDb();
  const syncRuns = [...cms.syncRuns]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, MAX_SYNC_RUNS);

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM blocks`).run();
    insertBlocks(db, cms.blocks);

    db.prepare(`DELETE FROM leads`).run();
    insertLeads(db, cms.leads);

    db.prepare(`DELETE FROM sync_runs`).run();
    insertSyncRuns(db, syncRuns);

    db.prepare(`DELETE FROM roles`).run();
    insertRoles(db, cms.roles);

    db.prepare(`DELETE FROM users`).run();
    insertUsers(db, cms.users);

    writeSettings(db, cms.settings);
    db.prepare(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')`
    ).run();
  });
  tx();
}

export function updateDb(mutator: (db: CmsDb) => void): CmsDb {
  const cms = readDb();
  mutator(cms);
  writeDb(cms);
  return cms;
}

export function saveAdminSession(record: AdminSessionRecord) {
  if (isProductionBuild()) return;
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO admin_sessions
      (token, user_id, login, role_id, created_at, expires_at)
     VALUES (@token, @user_id, @login, @role_id, @created_at, @expires_at)`
  ).run({
    token: record.token,
    user_id: record.userId,
    login: record.login,
    role_id: record.roleId,
    created_at: record.createdAt,
    expires_at: record.expiresAt,
  });
}

export function loadAdminSession(token: string): AdminSessionRecord | null {
  if (isProductionBuild() || !token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT token, user_id, login, role_id, created_at, expires_at
       FROM admin_sessions WHERE token = ?`
    )
    .get(token) as
    | {
        token: string;
        user_id: string;
        login: string;
        role_id: string;
        created_at: string;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  return {
    token: row.token,
    userId: row.user_id,
    login: row.login,
    roleId: row.role_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function deleteAdminSession(token: string | undefined) {
  if (isProductionBuild() || !token) return;
  const db = getDb();
  db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).run(token);
}

export function purgeExpiredAdminSessions() {
  if (isProductionBuild()) return;
  const db = getDb();
  db.prepare(`DELETE FROM admin_sessions WHERE expires_at < ?`).run(
    new Date().toISOString()
  );
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCmsDataDir() {
  return DATA_DIR;
}

export function getSqlitePath() {
  return SQLITE_FILE;
}

/** Shared SQLite handle for CMS modules (chat, etc.). */
export function getCmsSqlite(): SqliteDatabase {
  const db = getDb();
  ensureChatSchema(db);
  return db;
}

export function isCmsBuildPhase() {
  return isProductionBuild();
}
