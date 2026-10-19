import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { invalidateCruiseCache } from "@/lib/cruise-search/load-cruises";
import { uid, updateDb, type SyncRun } from "./store";

const ROOT = process.cwd();
const PARSER = path.join(ROOT, "cruise-search", "run-parser.sh");
const LOG_DIR = path.join(ROOT, "data", "cruise-search", "logs");
const PID_FILE = path.join(LOG_DIR, "update.pid");
const OUTPUT_FILE = path.join(
  ROOT,
  "data",
  "cruise-search",
  "cruises_output.json"
);
const STATE_FILE = path.join(ROOT, "data", "cruise-search", ".last-update");

function readPid(): number | null {
  try {
    if (!fs.existsSync(PID_FILE)) return null;
    const pid = Number(fs.readFileSync(PID_FILE, "utf-8").trim());
    if (!Number.isFinite(pid) || pid <= 0) return null;
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      fs.unlinkSync(PID_FILE);
      return null;
    }
  } catch {
    return null;
  }
}

function countCruises(): number | undefined {
  try {
    const raw = fs.readFileSync(OUTPUT_FILE, "utf-8").trim();
    if (!raw) return undefined;
    const candidates = [
      raw,
      raw.startsWith("[") ? raw : `[${raw}]`,
      `${raw.replace(/,\s*$/, "")}]`,
    ];
    for (const candidate of candidates) {
      try {
        const parsed: unknown = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed.length;
      } catch {
        // try next
      }
    }
    return raw.match(/^\{\s*$/gm)?.length ?? undefined;
  } catch {
    return undefined;
  }
}

function readLastUpdateIso(): string | null {
  try {
    const seconds = Number(fs.readFileSync(STATE_FILE, "utf-8").trim());
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return new Date(seconds * 1000).toISOString();
  } catch {
    return null;
  }
}

function latestLogTail(maxChars = 6000): string | undefined {
  try {
    if (!fs.existsSync(LOG_DIR)) return undefined;
    const files = fs
      .readdirSync(LOG_DIR)
      .filter((name) => name.startsWith("update-") && name.endsWith(".log"))
      .map((name) => {
        const full = path.join(LOG_DIR, name);
        return { full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    if (!files[0]) return undefined;
    const content = fs.readFileSync(files[0].full, "utf-8");
    return content.slice(-maxChars);
  } catch {
    return undefined;
  }
}

function finishRun(runId: string) {
  invalidateCruiseCache();
  const cruiseCount = countCruises();
  const logTail = latestLogTail();
  const success = cruiseCount !== undefined && cruiseCount > 0;
  updateDb((db) => {
    const index = db.syncRuns.findIndex((item) => item.id === runId);
    if (index < 0) return;
    const current = db.syncRuns[index];
    if (current.status !== "running") return;
    db.syncRuns[index] = {
      ...current,
      status: success ? "success" : "error",
      finishedAt: new Date().toISOString(),
      cruiseCount,
      logTail,
      message: success
        ? `Оновлено: ${cruiseCount} круїзів`
        : "Синхронізація завершилась без даних",
    };
  });
}

export function getSyncStatus() {
  const pid = readPid();
  return {
    running: pid !== null,
    pid,
    cruiseCount: countCruises(),
    lastDataUpdateAt: readLastUpdateIso(),
    logTail: latestLogTail(),
    parserExists: fs.existsSync(PARSER),
  };
}

export function startCruiseSync(
  triggeredBy: SyncRun["triggeredBy"] = "admin",
  options?: { limit?: number }
) {
  const existingPid = readPid();
  if (existingPid) {
    return {
      ok: false as const,
      error: "already_running",
      pid: existingPid,
    };
  }

  if (!fs.existsSync(PARSER)) {
    return { ok: false as const, error: "parser_missing" };
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(LOG_DIR, `update-${stamp}.log`);
  const out = fs.openSync(logFile, "a");
  const err = fs.openSync(logFile, "a");

  const args = ["--force"];
  const limit =
    typeof options?.limit === "number" &&
    Number.isFinite(options.limit) &&
    options.limit > 0
      ? Math.floor(options.limit)
      : null;
  if (limit) {
    args.push("--limit", String(limit));
  }

  const child = spawn(PARSER, args, {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", out, err],
    env: process.env,
  });

  child.unref();
  if (child.pid) {
    fs.writeFileSync(PID_FILE, String(child.pid));
  }

  const run: SyncRun = {
    id: uid("sync"),
    status: "running",
    startedAt: new Date().toISOString(),
    triggeredBy,
    message: limit
      ? `Синхронізацію запущено (ліміт ${limit})`
      : "Синхронізацію запущено",
  };

  updateDb((db) => {
    db.syncRuns = [run, ...db.syncRuns].slice(0, 100);
  });

  const watch = setInterval(() => {
    const still = readPid();
    if (still) return;
    clearInterval(watch);
    finishRun(run.id);
  }, 4000);

  setTimeout(() => clearInterval(watch), 1000 * 60 * 60 * 2);

  return { ok: true as const, run, pid: child.pid, logFile, limit };
}

export function stopCruiseSync() {
  const pid = readPid();
  if (!pid) {
    return { ok: false as const, error: "not_running" as const };
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return { ok: false as const, error: "kill_failed" as const };
    }
  }

  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }

  updateDb((db) => {
    const index = db.syncRuns.findIndex((item) => item.status === "running");
    if (index < 0) return;
    db.syncRuns[index] = {
      ...db.syncRuns[index],
      status: "error",
      finishedAt: new Date().toISOString(),
      cruiseCount: countCruises(),
      logTail: latestLogTail(),
      message: "Зупинено вручну",
    };
  });

  invalidateCruiseCache();

  return { ok: true as const, pid };
}
