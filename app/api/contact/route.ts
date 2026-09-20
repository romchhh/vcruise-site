import { NextResponse } from "next/server";
import {
  formatContactTelegramMessage,
  type ContactFormPayload,
} from "@/lib/contact/format-message";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function parsePayload(body: Record<string, unknown>): ContactFormPayload | null {
  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));

  if (!name || phone.length < 10) {
    return null;
  }

  return {
    name,
    phone,
    details: String(body.details ?? "").trim() || undefined,
  };
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
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

  const payload = parsePayload(body);

  if (!payload) {
    return NextResponse.json(
      { error: "Вкажіть ім'я та коректний номер телефону." },
      { status: 400 }
    );
  }

  const text = formatContactTelegramMessage(payload);

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
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Не вдалося надіслати заявку. Спробуйте пізніше." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
