import { parseRouteText } from "./route-stops";

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; route: string[] }>();
const inflight = new Map<string, Promise<string[] | null>>();

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; VcruiseBot/1.0; +https://vcruise.com.ua)",
  Accept: "text/html,application/xhtml+xml",
  Referer: "https://4gates.cruises/ua/search/?",
};

function extractRouteFromDetailHtml(html: string) {
  const patterns = [
    /<strong>\s*Маршрут:\s*<\/strong>\s*<span>([\s\S]*?)<\/span>/i,
    /<b>\s*Маршрут:\s*<\/b>\s*<br\s*\/?>\s*<span>([\s\S]*?)<\/span>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const route = parseRouteText(text);
    if (route.length) return route;
  }
  return null;
}

/**
 * Full itinerary from the 4gates sailing page.
 * Search getitems often returns an abbreviated route ending with "… Port".
 */
export async function fetchFourgatesFullRoute(bookingUrl: string) {
  const url = bookingUrl.trim();
  if (!url.startsWith("https://4gates.cruises/")) return null;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.route;
  }

  const pending = inflight.get(url);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        cache: "no-store",
      });
      if (!response.ok) return null;
      const html = await response.text();
      const route = extractRouteFromDetailHtml(html);
      if (!route?.length) return null;
      cache.set(url, { at: Date.now(), route });
      return route;
    } catch {
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise;
}
