const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const MAX_FORM_AGE_MS = 60 * 60 * 1000;

const rateLimitStore = new Map<string, number[]>();

function simpleHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function getClientIp(request: Request) {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-vercel-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const ip = candidate.split(",")[0]?.trim();
    if (ip) return ip;
  }

  return "unknown";
}

export function getRateLimitKey(request: Request) {
  const ip = getClientIp(request);

  if (ip !== "unknown") {
    return ip;
  }

  const userAgent = request.headers.get("user-agent") ?? "no-ua";
  return `unknown:${simpleHash(userAgent)}`;
}

export function checkRateLimit(key: string) {
  const now = Date.now();
  const recent = (rateLimitStore.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

type SpamCheckResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export function validateSpamGuard(
  body: Record<string, unknown>
): SpamCheckResult {
  const honeypot = String(body._hp ?? "").trim();
  if (honeypot.length >= 2) {
    return {
      ok: false,
      status: 400,
      message: "Не вдалося надіслати заявку.",
    };
  }

  const startedAt = Number(body.startedAt);
  const now = Date.now();

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Оновіть сторінку і спробуйте ще раз.",
    };
  }

  if (now - startedAt > MAX_FORM_AGE_MS) {
    return {
      ok: false,
      status: 400,
      message: "Форма застаріла. Оновіть сторінку і спробуйте знову.",
    };
  }

  return { ok: true };
}
