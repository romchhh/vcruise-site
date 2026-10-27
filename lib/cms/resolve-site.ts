import { siteConfig } from "@/lib/site";
import { cmsSettings } from "./content";
import type { SiteSettings } from "./store";

const PLACEHOLDER_PHONE = "+380000000000";

const LEGACY_TELEGRAM_LINKS = new Set([
  "",
  "https://t.me/vcruise",
  "http://t.me/vcruise",
]);

function resolvePhone(stored: string | undefined) {
  const value = stored?.trim();
  if (!value || value === PLACEHOLDER_PHONE) return siteConfig.phone;
  return value;
}

function resolvePhoneDisplay(stored: string | undefined) {
  const value = stored?.trim();
  if (!value || value.includes("XXX")) return siteConfig.phoneDisplay;
  return value;
}

function resolveSocialTelegram(stored: string | undefined) {
  const value = stored?.trim();
  if (!value || LEGACY_TELEGRAM_LINKS.has(value)) {
    return siteConfig.messengers.telegram || "";
  }
  return value;
}

/** Merges CMS settings over static/env defaults for public pages. */
export function resolveSiteSettings(): SiteSettings & {
  name: string;
  title: string;
  description: string;
  url: string;
} {
  const settings = cmsSettings();
  return {
    ...settings,
    brandName: settings.brandName || siteConfig.name,
    legalName: settings.legalName || siteConfig.legalName,
    email: settings.email || siteConfig.email,
    phone: resolvePhone(settings.phone),
    phoneDisplay: resolvePhoneDisplay(settings.phoneDisplay),
    socialInstagram: settings.socialInstagram || siteConfig.social.instagram,
    socialFacebook: settings.socialFacebook || siteConfig.social.facebook,
    socialTelegram: resolveSocialTelegram(settings.socialTelegram),
    telegramUsername:
      settings.telegramUsername || siteConfig.messengers.telegramUsername,
    socialViber: settings.socialViber || siteConfig.messengers.viber || "",
    metaTitle: settings.metaTitle || siteConfig.title,
    metaDescription: settings.metaDescription || siteConfig.description,
    name: settings.brandName || siteConfig.name,
    title: settings.metaTitle || siteConfig.title,
    description: settings.metaDescription || siteConfig.description,
    url: siteConfig.url,
  };
}
