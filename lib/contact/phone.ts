export function extractUaPhoneDigits(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("380")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("38")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 9);
}

export function formatUaPhoneInput(value: string) {
  const digits = extractUaPhoneDigits(value);

  if (!digits) {
    return "+380 ";
  }

  let formatted = "+380";

  if (digits.length > 0) {
    formatted += ` (${digits.slice(0, 2)}`;
  }

  if (digits.length >= 2) {
    formatted += ")";
  }

  if (digits.length > 2) {
    formatted += ` ${digits.slice(2, 5)}`;
  }

  if (digits.length > 5) {
    formatted += `-${digits.slice(5, 7)}`;
  }

  if (digits.length > 7) {
    formatted += `-${digits.slice(7, 9)}`;
  }

  return formatted;
}

export function isValidUaPhone(value: string) {
  return extractUaPhoneDigits(value).length === 9;
}

export function normalizeUaPhone(value: string) {
  const digits = extractUaPhoneDigits(value);
  return digits.length === 9 ? `+380${digits}` : "";
}
