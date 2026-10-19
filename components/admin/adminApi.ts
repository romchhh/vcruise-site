"use client";

export async function adminFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Немає звʼязку з сервером. Перевірте, що next dev запущений, і спробуйте ще раз."
    );
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok) {
    throw new Error(
      data.error || `Помилка запиту (${response.status})`
    );
  }

  return data as T;
}
