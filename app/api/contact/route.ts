import { NextResponse } from "next/server";
import {
  formatContactTelegramMessage,
} from "@/lib/contact/format-message";
import { parseContactRequest } from "@/lib/contact/parse-contact-request";
import {
  checkRateLimit,
  getRateLimitKey,
  validateSpamGuard,
} from "@/lib/contact/spam-guard";

function parseChatId(value: string) {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIdRaw = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatIdRaw) {
    return NextResponse.json(
      { error: "Сервіс заявок тимчасово недоступний." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некоректні дані форми." }, { status: 400 });
  }

  const spamCheck = validateSpamGuard(body);
  if (!spamCheck.ok) {
    return NextResponse.json(
      { error: spamCheck.message },
      { status: spamCheck.status }
    );
  }

  const parsed = parseContactRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = parsed.payload;

  const rateLimitKey = getRateLimitKey(request);

  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: "Забагато спроб. Спробуйте через хвилину." },
      { status: 429 }
    );
  }

  const text = formatContactTelegramMessage(payload);
  const chatId = parseChatId(chatIdRaw);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        cache: "no-store",
      }
    );

    const data = (await response.json()) as {
      ok?: boolean;
      description?: string;
    };

    if (!response.ok || !data.ok) {
      console.error("Telegram sendMessage failed:", data.description ?? response.status);

      const message =
        process.env.NODE_ENV === "development" && data.description
          ? `Telegram: ${data.description}`
          : "Не вдалося надіслати заявку. Спробуйте пізніше.";

      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    console.error("Telegram request error:", error);
    return NextResponse.json(
      { error: "Не вдалося надіслати заявку. Спробуйте пізніше." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
