const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const MIN_SUBMIT_DELAY_MS = 1_000;
const MAX_FORM_AGE_MS = 60 * 60 * 1000;

const rateLimitStore = new Map<string, number[]>();

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(ip: string) {
  const now = Date.now();
  const recent = (rateLimitStore.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);
  return true;
}

type SpamCheckResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export function validateSpamGuard(
  body: Record<string, unknown>
): SpamCheckResult {
  const honeypot = String(body._hp ?? "").trim();
  if (honeypot) {
    return {
      ok: false,
      status: 400,
      message: "Не вдалося надіслати заявку.",
    };
  }

  const startedAt = Number(body.startedAt);
  const now = Date.now();

  if (!Number.isFinite(startedAt)) {
    return {
      ok: false,
      status: 400,
      message: "Некоректні дані форми.",
    };
  }

  if (now - startedAt < MIN_SUBMIT_DELAY_MS) {
    return {
      ok: false,
      status: 429,
      message: "Зачекайте кілька секунд і спробуйте ще раз.",
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
