import { NextResponse } from "next/server";
import {
  formatContactTelegramMessage,
  type ContactFormPayload,
  type CruiseBookingDetails,
} from "@/lib/contact/format-message";
import { isValidUaPhone, normalizeUaPhone } from "@/lib/contact/phone";
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

function parseBooking(
  value: unknown
): CruiseBookingDetails | null | undefined {
  if (!value || typeof value !== "object") return undefined;

  const booking = value as Record<string, unknown>;
  const linerName = String(booking.linerName ?? "").trim();
  const company = String(booking.company ?? "").trim();
  const region = String(booking.region ?? "").trim();
  const route = String(booking.route ?? "").trim();
  const cruiseDate = String(booking.cruiseDate ?? "").trim();
  const nights = Number(booking.nights);
  const priceLabel = String(booking.priceLabel ?? "").trim();

  if (
    !linerName ||
    !company ||
    !region ||
    !route ||
    !/^\d{4}-\d{2}-\d{2}$/.test(cruiseDate) ||
    !Number.isFinite(nights) ||
    nights < 1
  ) {
    return null;
  }

  return {
    linerName: linerName.slice(0, 120),
    company: company.slice(0, 120),
    region: region.slice(0, 120),
    route: route.slice(0, 500),
    cruiseDate,
    nights,
    priceLabel: priceLabel ? priceLabel.slice(0, 80) : undefined,
  };
}

function parsePayload(body: Record<string, unknown>): ContactFormPayload | null {
  const name = String(body.name ?? "").trim();

  if (!name || name.length < 2 || name.length > 80) {
    return null;
  }

  const phoneRaw = String(body.phone ?? "");
  if (!isValidUaPhone(phoneRaw)) {
    return null;
  }

  const details = String(body.details ?? "").trim();
  const booking = parseBooking(body.booking);

  if (body.booking && !booking) {
    return null;
  }

  return {
    name,
    phone: normalizeUaPhone(phoneRaw),
    details: details ? details.slice(0, 1000) : undefined,
    booking: booking ?? undefined,
  };
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

  const payload = parsePayload(body);

  if (!payload) {
    return NextResponse.json(
      { error: "Вкажіть ім'я та коректний номер телефону." },
      { status: 400 }
    );
  }

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
