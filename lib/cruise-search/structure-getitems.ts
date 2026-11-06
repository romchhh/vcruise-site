import type { CabinPriceMap, CruiseDate, CruiseRecord } from "./types";

type RawGetitemsRow = Record<string, unknown>;

function cleanMoney(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function ddmmyyyyToIso(text: string): string | undefined {
  const match = text.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return undefined;
  const [, d, mo, y] = match;
  return `${y}-${mo}-${d}`;
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseCabinsBlock(html: string): CabinPriceMap {
  const cabins: CabinPriceMap = {};
  if (!html) return cabins;

  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRe.exec(html)) !== null) {
    const block = liMatch[1];
    const nameMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const cabinName = nameMatch ? stripTags(nameMatch[1]) : "";
    if (!cabinName) continue;

    const prices: Partial<Record<"NAT" | "USD" | "EUR", number>> = {};
    const spanRe = /<span[^>]*class="[^"]*_?(NAT|USD|EUR)[^"]*"[^>]*>([^<]*)<\/span>/gi;
    let spanMatch: RegExpExecArray | null;
    while ((spanMatch = spanRe.exec(block)) !== null) {
      const code = spanMatch[1] as "NAT" | "USD" | "EUR";
      const amount = cleanMoney(spanMatch[2]);
      if (amount != null) prices[code] = amount;
    }
    cabins[cabinName as keyof CabinPriceMap] = prices;
  }

  return cabins;
}

function parsePriceCabins(html: string | undefined) {
  if (!html) return {};
  const ulMatch = html.match(/<ul[^>]*class="[^"]*cruise__cabins[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  return parseCabinsBlock(ulMatch?.[1] ?? html);
}

function parsePriceCabinsNext(html: string | undefined): CruiseDate[] {
  if (!html) return [];
  const dates: CruiseDate[] = [];
  const blockRe =
    /<div[^>]*class="[^"]*cruise__dates[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*cruise__dates|$)/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRe.exec(html)) !== null) {
    const block = blockMatch[1];
    const dateSpan = block.match(
      /class="[^"]*cruise__dates-current[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i,
    );
    const dateRaw = dateSpan?.[1]?.trim() ?? "";
    const linkMatch = block.match(
      /<a[^>]*class="[^"]*cruise__btn-select[^"]*"[^>]*href="([^"]+)"/i,
    );
    let bookingUrl = linkMatch?.[1]?.trim();
    if (bookingUrl?.startsWith("/")) {
      bookingUrl = `https://4gates.cruises${bookingUrl}`;
    }
    const ulMatch = block.match(/<ul[^>]*class="[^"]*cruise__cabins[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
    dates.push({
      date: ddmmyyyyToIso(dateRaw) ?? "",
      date_raw: dateRaw || undefined,
      booking_url: bookingUrl || undefined,
      cabins: parseCabinsBlock(ulMatch?.[1] ?? ""),
    });
  }
  return dates.filter((entry) => entry.date);
}

function parseRoute(html: string | undefined) {
  if (!html) return [] as string[];
  const text = stripTags(html);
  return text
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseFlags(html: string | undefined) {
  if (!html) return [] as string[];
  const countries: string[] = [];
  const re = /class="[^"]*flag[^"]*"[^>]*title="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const title = match[1]?.trim();
    if (title) countries.push(title);
  }
  return countries;
}

function parseClassField(html: string | undefined) {
  if (!html) return undefined;
  const match = html.match(/<b[^>]*>([^<]+)<\/b>/i);
  if (match?.[1]) return match[1].trim() || undefined;
  const text = stripTags(html);
  return text || undefined;
}

function parseRenovYear(html: string | undefined) {
  if (!html) return undefined;
  const match = html.match(/(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseLinerSize(html: string | undefined) {
  if (!html) return undefined;
  const match = html.match(/Размер лайнера\s*:\s*<b>([^<]+)<\/b>/i);
  return match?.[1]?.trim() || undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function structureGetitemsRow(item: RawGetitemsRow): CruiseRecord {
  const priceCabins = item.price_cabins;
  const priceCabinsNext = item.price_cabins_next;
  const iteraty = item.iteraty;
  const flag = item.flag;
  const classes = item.classes;
  const classesCompany = item.classes__company;
  const dateRenov = item.date_renov;
  const icons = item.icons_serv_cruises;

  return {
    key: toNumber(item.key) ?? 0,
    cruise_id: String(item.cruise_id ?? ""),
    cruise_title: String(item.cruise_title ?? ""),
    cruise_logo:
      typeof item.cruise_logo === "string" ? item.cruise_logo : undefined,
    liner_slug: String(item.liner_slug ?? ""),
    liner_name: String(item.liner_name ?? ""),
    ship_id: typeof item.ship_id === "string" ? item.ship_id : undefined,
    ship_built_year: toNumber(item.date_spusc),
    ship_renovated_year: parseRenovYear(
      typeof dateRenov === "string" ? dateRenov : undefined,
    ),
    ship_class: parseClassField(typeof classes === "string" ? classes : undefined),
    company_class: parseClassField(
      typeof classesCompany === "string" ? classesCompany : undefined,
    ),
    ship_size: parseLinerSize(typeof icons === "string" ? icons : undefined),
    liner_logo:
      typeof item.logo_liner === "string" ? item.logo_liner : undefined,
    region_name: String(item.region_name ?? "").trim() || "",
    region_id: String(item.region_id ?? ""),
    route: parseRoute(typeof iteraty === "string" ? iteraty : undefined),
    visa_countries: parseFlags(typeof flag === "string" ? flag : undefined),
    port_from_id: toNumber(item.port_from_id),
    duration_days: toNumber(item.durations),
    duration_days_str:
      typeof item.durations_str === "string" ? item.durations_str : undefined,
    nights: toNumber(item.nights) ?? 0,
    nights_str:
      typeof item.nights_str === "string" ? item.nights_str : undefined,
    base_date_start:
      (typeof item.date_start === "string" ? item.date_start : undefined) ||
      ddmmyyyyToIso(typeof item.dstart === "string" ? item.dstart : ""),
    base_date_end: ddmmyyyyToIso(
      typeof item.dend === "string" ? item.dend : "",
    ),
    from_price: parsePriceCabins(
      typeof priceCabins === "string" ? priceCabins : undefined,
    ),
    available_dates: parsePriceCabinsNext(
      typeof priceCabinsNext === "string" ? priceCabinsNext : undefined,
    ),
    star_rating: toNumber(item.star),
    review_score: toNumber(item.starid) ?? null,
    review_count: toNumber(item.countreview),
    locale: typeof item.locale === "string" ? item.locale : undefined,
  };
}

export function structureGetitemsRows(items: RawGetitemsRow[]) {
  const seen = new Set<number>();
  const rows = [];
  for (const item of items) {
    const cruise = structureGetitemsRow(item);
    if (cruise.key <= 0 || !cruise.cruise_title) continue;
    // getitems repeats the same sailing across pages (same key).
    if (seen.has(cruise.key)) continue;
    seen.add(cruise.key);
    rows.push(cruise);
  }
  return rows;
}
