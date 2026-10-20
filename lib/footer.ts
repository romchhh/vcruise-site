import { cmsBlock } from "@/lib/cms/content";
import { resolveDestinations } from "@/lib/cms/section-items";
import { buildSearchParams } from "@/lib/cruise-search/params";
import { siteConfig } from "@/lib/site";

export {
  footerLegal,
  footerSubscribe,
  footerTagline,
} from "./footer-copy";

const footerDestinationIds = [
  "southern-europe",
  "northern-europe",
  "asia",
  "africa",
  "australia",
  "transatlantic",
] as const;

function footerDestinationById(id: (typeof footerDestinationIds)[number]) {
  return resolveDestinations(cmsBlock("destinations")).find(
    (item) => item.id === id,
  );
}

function footerDestinationLabel(id: (typeof footerDestinationIds)[number]) {
  const destination = footerDestinationById(id);
  if (!destination) return id;
  if (id === "asia") return "Азія";
  if (id === "australia") return "Австралія та Океанія";
  return destination.title;
}

function footerDestinationSearchHref(id: (typeof footerDestinationIds)[number]) {
  const destination = footerDestinationById(id);
  if (!destination) return "/search";
  return `/search?${buildSearchParams({ regions: [destination.searchLabel] })}`;
}

/** Server-only: reads CMS destinations for footer links. */
export function getFooterLinkColumns() {
  return [
    {
      title: "Направлення",
      links: footerDestinationIds.map((id) => ({
        label: footerDestinationLabel(id),
        href: footerDestinationSearchHref(id),
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
  ];
}
