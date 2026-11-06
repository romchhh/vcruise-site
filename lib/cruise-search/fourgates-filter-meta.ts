const BASE = "https://4gates.cruises";
const AGENT_ID = "06138bc5af6023646ede0e1f7c1eac75";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type FourgatesShipEntry = {
  cruiseId: string;
  name: string;
  shipId: string;
  slug: string;
};

export type FourgatesFilterMeta = {
  dateMin: string;
  dateMax: string;
  shipsBySlug: Map<string, FourgatesShipEntry>;
};

let cache: { at: number; meta: FourgatesFilterMeta } | null = null;
let inflight: Promise<FourgatesFilterMeta> | null = null;

function slugifyShipName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseShipRows(raw: unknown): FourgatesShipEntry[] {
  if (!Array.isArray(raw)) return [];
  const rows: FourgatesShipEntry[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 3) continue;
    const cruiseId = String(item[0] ?? "").trim();
    const name = String(item[1] ?? "").trim();
    const shipId = String(item[2] ?? "").trim();
    if (!cruiseId || !name || !shipId) continue;
    rows.push({
      cruiseId,
      name,
      shipId,
      slug: slugifyShipName(name),
    });
  }
  return rows;
}

/** Shared getfilter payload: widget date window + ship_id index. */
export async function loadFourgatesFilterMeta(): Promise<FourgatesFilterMeta> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.meta;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const url = `${BASE}/search_agent/ajax.php?act=getfilter&agentidmodule=${AGENT_ID}&locale=ua`;
    const response = await fetch(url, {
      headers: {
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${BASE}/ua/search/?`,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`4gates getfilter HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      date_min?: string;
      date_max?: string;
      filters?: { ship_id?: unknown };
    };

    const shipsBySlug = new Map<string, FourgatesShipEntry>();
    for (const ship of parseShipRows(data.filters?.ship_id)) {
      shipsBySlug.set(ship.slug, ship);
      const parts = ship.slug.split("-");
      if (parts.length > 1) {
        const short = parts.slice(1).join("-");
        if (short && !shipsBySlug.has(short)) shipsBySlug.set(short, ship);
      }
    }

    const meta: FourgatesFilterMeta = {
      dateMin: String(data.date_min ?? "").trim(),
      dateMax: String(data.date_max ?? "").trim(),
      shipsBySlug,
    };
    cache = { at: Date.now(), meta };
    return meta;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}
