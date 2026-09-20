import fs from "fs";
import path from "path";
import { isFeaturedCompany } from "./companies";
import { serializeCruisesForClient } from "./serialize-cruises";
import type { CruiseRecord } from "./types";

let cachedCruises: CruiseRecord[] | null = null;

export function loadCruises() {
  if (cachedCruises) return cachedCruises;

  const filePath = path.join(
    process.cwd(),
    "data",
    "cruise-search",
    "cruises_output.json"
  );
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  const parsed = JSON.parse(
    raw.startsWith("[") ? raw : `[${raw}]`
  ) as CruiseRecord[];

  const seenKeys = new Set<number>();

  cachedCruises = parsed.filter((cruise) => {
    if (!isFeaturedCompany(cruise.cruise_title)) return false;
    if (seenKeys.has(cruise.key)) return false;
    seenKeys.add(cruise.key);
    return true;
  });

  return cachedCruises;
}

export function loadClientCruises() {
  return serializeCruisesForClient(loadCruises());
}
