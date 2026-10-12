import { destinations } from "@/data/destinations";
import { siteConfig } from "@/lib/site";

const footerDestinationIds = [
  "southern-europe",
  "northern-europe",
  "asia",
  "africa",
  "australia",
  "transatlantic",
] as const;

function footerDestinationLabel(id: (typeof footerDestinationIds)[number]) {
  const destination = destinations.find((item) => item.id === id);
  if (!destination) return id;
  if (id === "asia") return "Азія";
  if (id === "australia") return "Австралія та Океанія";
  return destination.title;
}

export const footerLinkColumns = [
  {
    title: "Направлення",
    links: footerDestinationIds.map((id) => ({
      label: footerDestinationLabel(id),
      href: "#destinations",
    })),
  },
  {
    title: "Круїзи",
    links: [
      { label: "Пошук круїзів", href: "/search" },
      { label: "Підбір круїзу", href: "#cruise-finder" },
    ],
  },
  {
    title: "Про нас",
    links: [{ label: "Наша команда", href: "#about" }],
  },
  {
    title: "Контакти",
    links: [
      {
        label: siteConfig.phoneDisplay,
        href: `tel:${siteConfig.phone}`,
      },
    ],
  },
] as const;

export const footerTagline = "Ваш особистий провідник у світ круїзів";

export const footerSubscribe = {
  text: "Отримуйте найвигідніші пропозиції першими",
  button: "Підписатись",
};

export const footerLegal = {
  copyright: "© 2026 Cruise Agency. Усі права захищено.",
  privacy: { label: "Політика конфіденційності", href: "/privacy" },
  terms: { label: "Умови використання", href: "/terms" },
};
