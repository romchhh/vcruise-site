export type ContactFormPayload = {
  name: string;
  phone: string;
  details?: string;
};

export function formatContactTelegramMessage(payload: ContactFormPayload) {
  const lines = [
    "🛳 Нова заявка VCRUISE",
    "",
    `👤 Ім'я: ${payload.name}`,
    `📞 Телефон: ${payload.phone}`,
  ];

  if (payload.details?.trim()) {
    lines.push("", "📝 Додаткові деталі:", payload.details.trim());
  }

  return lines.join("\n");
}
