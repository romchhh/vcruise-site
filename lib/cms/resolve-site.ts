import { siteConfig } from "@/lib/site";
import { cmsSettings } from "./content";
import type { SiteSettings } from "./store";

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
    phone: settings.phone || siteConfig.phone,
    phoneDisplay: settings.phoneDisplay || siteConfig.phoneDisplay,
    socialInstagram: settings.socialInstagram || siteConfig.social.instagram,
    socialFacebook: settings.socialFacebook || siteConfig.social.facebook,
    socialTelegram:
      settings.socialTelegram || siteConfig.messengers.telegram || "",
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
