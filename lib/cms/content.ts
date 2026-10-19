import fs from "fs";
import path from "path";
import {
  readDb,
  type ContentBlock,
  type ContentBlockKey,
  type SiteSettings,
  type SyncRunStatus,
} from "./store";

export type CmsDashboardStats = {
  leadsTotal: number;
  leadsNew: number;
  leadsToday: number;
  blocksCount: number;
  lastSyncAt: string | null;
  lastSyncStatus: SyncRunStatus | null;
  /** Number of cruises in the last parser output, when the file is readable. */
  cruiseCount?: number;
  /** ISO time of the last parser update (from `.last-update`), when available. */
  cruiseDataUpdatedAt?: string;
};

export function cmsSettings(): SiteSettings {
  return readDb().settings;
}

export function cmsBlocks(): ContentBlock[] {
  return readDb().blocks;
}

export function cmsBlock(key: ContentBlockKey): ContentBlock | undefined {
  return cmsBlocks().find((block) => block.key === key);
}

const CRUISE_DATA_DIR = path.join(process.cwd(), "data", "cruise-search");

let cruiseCountCache: { mtimeMs: number; count: number } | null = null;

/** Reads the parser's `.last-update` marker (unix seconds). Never throws. */
function readCruiseDataUpdatedAt(): string | undefined {
  try {
    const raw = fs
      .readFileSync(path.join(CRUISE_DATA_DIR, ".last-update"), "utf-8")
      .trim();
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
    return new Date(seconds * 1000).toISOString();
  } catch {
    return undefined;
  }
}

/** Counts records in `cruises_output.json` (cached by mtime). Never throws. */
function readCruiseCount(): number | undefined {
  try {
    const file = path.join(CRUISE_DATA_DIR, "cruises_output.json");
    const { mtimeMs } = fs.statSync(file);
    if (cruiseCountCache && cruiseCountCache.mtimeMs === mtimeMs) {
      return cruiseCountCache.count;
    }

    const raw = fs.readFileSync(file, "utf-8").trim();
    if (!raw) return undefined;

    let count: number;
    try {
      const parsed: unknown = JSON.parse(
        raw.startsWith("[") ? raw : `[${raw}]`
      );
      count = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      // The parser may write records incrementally (not yet a valid array):
      // count top-level records, which always start with "{" at column 0.
      count = raw.match(/^\{\s*$/gm)?.length ?? 0;
    }
    if (count <= 0) return undefined;

    cruiseCountCache = { mtimeMs, count };
    return count;
  } catch {
    return undefined;
  }
}

export function cmsDashboardStats(): CmsDashboardStats {
  const db = readDb();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const lastRun = [...db.syncRuns].sort((a, b) =>
    (b.finishedAt || b.startedAt).localeCompare(a.finishedAt || a.startedAt)
  )[0];

  const cruiseDataUpdatedAt = readCruiseDataUpdatedAt();
  const cruiseCount = readCruiseCount();

  return {
    leadsTotal: db.leads.length,
    leadsNew: db.leads.filter((lead) => lead.status === "new").length,
    leadsToday: db.leads.filter(
      (lead) => new Date(lead.createdAt).getTime() >= todayMs
    ).length,
    blocksCount: db.blocks.length,
    lastSyncAt: lastRun
      ? lastRun.finishedAt || lastRun.startedAt
      : (cruiseDataUpdatedAt ?? null),
    lastSyncStatus: lastRun ? lastRun.status : null,
    ...(cruiseCount !== undefined ? { cruiseCount } : {}),
    ...(cruiseDataUpdatedAt ? { cruiseDataUpdatedAt } : {}),
  };
}
