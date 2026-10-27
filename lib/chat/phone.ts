/** Мінімальна перевірка номера для чату (9+ цифр). */
export function isValidChatPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function normalizeChatPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9) return trimmed;
  if (digits.startsWith("380") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+38${digits}`;
  }
  if (digits.length === 9) {
    return `+380${digits}`;
  }
  return trimmed.startsWith("+") ? trimmed : `+${digits}`;
}
