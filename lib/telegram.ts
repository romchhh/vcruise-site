import { getSiteOrigin } from "@/lib/domains";

function parseChatId(value: string) {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIdRaw = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatIdRaw) return null;
  return { token, chatId: parseChatId(chatIdRaw) };
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const config = getTelegramConfig();
  if (!config) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          disable_web_page_preview: true,
        }),
        cache: "no-store",
      }
    );
    const data = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || !data.ok) {
      console.error(
        "Telegram sendMessage failed:",
        data.description ?? response.status
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Telegram request error:", error);
    return false;
  }
}

export function adminChatUrl(conversationId?: string) {
  const base = `${getSiteOrigin()}/admin/chat`;
  if (!conversationId) return base;
  return `${base}?c=${encodeURIComponent(conversationId)}`;
}

export function formatChatTelegramMessage(input: {
  visitorName?: string;
  visitorPhone?: string;
  page?: string;
  text?: string;
  hasAttachments?: boolean;
  conversationId: string;
}) {
  const preview =
    input.text?.trim() ||
    (input.hasAttachments ? "📎 Файл / фото" : "—");

  const lines = [
    "💬 Новий запит у чат VCRUISE",
    "",
    `👤 ${input.visitorName?.trim() || "Гість сайту"}`,
  ];

  if (input.visitorPhone?.trim()) {
    lines.push(`📞 ${input.visitorPhone.trim()}`);
  }

  lines.push(`🌐 Сторінка: ${input.page || "/"}`);
  lines.push("", "📝 Повідомлення:", preview.slice(0, 800));
  lines.push("", `🔗 Відкрити в адмінці: ${adminChatUrl(input.conversationId)}`);

  return lines.join("\n");
}

export function formatChatContactTelegramMessage(input: {
  visitorName?: string;
  visitorPhone: string;
  page?: string;
  conversationId: string;
}) {
  const lines = [
    "📞 Контакт залишили в чаті VCRUISE",
    "",
    `👤 ${input.visitorName?.trim() || "Гість сайту"}`,
    `📞 ${input.visitorPhone.trim()}`,
    `🌐 Сторінка: ${input.page || "/"}`,
    "",
    `🔗 Відкрити в адмінці: ${adminChatUrl(input.conversationId)}`,
  ];
  return lines.join("\n");
}
