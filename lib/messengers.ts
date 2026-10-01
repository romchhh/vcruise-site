import { siteConfig } from "@/lib/site";

export type MessengerId = "telegram" | "viber";

export type MessengerLink = {
  id: MessengerId;
  href: string;
  label: string;
};

const ORDER: MessengerId[] = ["telegram", "viber"];

function digitsOnlyPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function viberChatUrl(phoneDigits: string) {
  return `viber://chat?number=%2B${phoneDigits}`;
}

function resolveTelegramHref(): string {
  const direct = siteConfig.messengers.telegram.trim();
  if (direct) return direct;

  const username = siteConfig.messengers.telegramUsername
    .trim()
    .replace(/^@/, "");
  if (username) return `https://t.me/${username}`;

  return "";
}

function resolveViberHref(): string {
  const fromEnv = siteConfig.messengers.viber.trim();
  if (fromEnv) return fromEnv;

  const phoneDigits = digitsOnlyPhone(siteConfig.phone);
  if (phoneDigits.length >= 10) return viberChatUrl(phoneDigits);

  return "";
}

const labels: Record<MessengerId, string> = {
  telegram: "Написати в Telegram",
  viber: "Написати у Viber",
};

export function getMessengerLinks(): MessengerLink[] {
  const telegramHref = resolveTelegramHref();
  const viberHref = resolveViberHref();

  const resolved: Partial<Record<MessengerId, MessengerLink>> = {
    telegram: telegramHref
      ? {
          id: "telegram",
          href: telegramHref,
          label: labels.telegram,
        }
      : undefined,
    viber: viberHref
      ? {
          id: "viber",
          href: viberHref,
          label: labels.viber,
        }
      : undefined,
  };

  return ORDER.flatMap((id) => {
    const link = resolved[id];
    return link ? [link] : [];
  });
}
