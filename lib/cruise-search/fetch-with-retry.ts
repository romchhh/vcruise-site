export const FETCH_NETWORK_ERROR_UA =
  "Звʼязок перервався під час завантаження. Перевірте інтернет і спробуйте ще раз.";

export const FETCH_TIMEOUT_ERROR_UA =
  "Завантаження тривало занадто довго. Спробуйте ще раз — ми вже підготували повторну спробу.";

export function normalizeClientFetchError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed") ||
      msg.includes("network request failed")
    ) {
      return FETCH_NETWORK_ERROR_UA;
    }
    if (error.name === "AbortError") {
      return FETCH_TIMEOUT_ERROR_UA;
    }
    if (error.message.trim()) return error.message;
  }
  return FETCH_NETWORK_ERROR_UA;
}

type FetchJsonOptions = {
  retries?: number;
  timeoutMs?: number;
  init?: RequestInit;
};

export async function fetchJsonWithRetry<T>(
  url: string,
  { retries = 3, timeoutMs = 120_000, init }: FetchJsonOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });

      const data = (await response.json()) as T & { error?: string };

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Не вдалося завантажити дані.",
        );
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 800 * (attempt + 1)),
        );
        continue;
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastError;
}
