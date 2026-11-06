import fs from "fs";
import path from "path";

const STATE_FILE = path.join(
  process.cwd(),
  "data",
  "cruise-search",
  ".last-update",
);

export function readCatalogFileUpdatedAt(): string | null {
  try {
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ STATE_FILE, "utf-8").trim();
    const ts = Number.parseInt(raw, 10);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}
