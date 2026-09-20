import type { Metadata } from "next";
import { siteConfig, absoluteUrl } from "./site";

type PageSeoOptions = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
  ogImageAlt?: string;
  type?: "website" | "article";
};

export function createMetadata({
  title,
  description,
  path = "/",
  keywords,
  noIndex = false,
  ogImage,
  ogImageAlt,
  type = "website",
}: PageSeoOptions = {}): Metadata {
  const pageTitle = title ?? siteConfig.title;
  const pageDescription = description ?? siteConfig.description;
  const canonical = absoluteUrl(path);
  const image = absoluteUrl(ogImage ?? siteConfig.ogImage);
  const imageAlt = ogImageAlt ?? siteConfig.ogImageAlt;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.title,
      template: `%s | ${siteConfig.name}`,
    },
    description: pageDescription,
    keywords: keywords ?? [...siteConfig.keywords],
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
    creator: siteConfig.legalName,
    publisher: siteConfig.legalName,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical,
      languages: {
        "uk-UA": canonical,
      },
    },
    openGraph: {
      type,
      locale: siteConfig.locale,
      url: canonical,
      siteName: siteConfig.name,
      title: pageTitle,
      description: pageDescription,
      images: [
        {
          url: image,
          width: 4096,
          height: 2731,
          alt: imageAlt,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [image],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    category: "travel",
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
      apple: "/apple-icon.svg",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: siteConfig.name,
      statusBarStyle: "default",
    },
    other: {
      "geo.region": "UA-30",
      "geo.placename": "Київ",
      "content-language": siteConfig.language,
      "og:email": siteConfig.email,
      "og:phone_number": siteConfig.phone,
      "og:locale:alternate": "en_US",
    },
  };
}
