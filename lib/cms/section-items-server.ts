import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { pickHotDeals } from "@/lib/cruise-search/hot-deals";
import { pickUniqueRoutes } from "@/lib/cruise-search/unique-routes";
import { nearestDate } from "@/lib/cruise-search/utils";
import { curatedCardFromPick } from "@/lib/cms/section-card-shared";
import { defaultCardsFor } from "@/lib/cms/section-items";
import type { ContentBlockCard, ContentBlockKey } from "@/lib/cms/store";

/**
 * Live cruise picks / static defaults for admin «Підтягнути».
 * Hot deals & unique routes return curation fields: company + liner + date.
 */
export function suggestCardsFor(key: ContentBlockKey): ContentBlockCard[] {
  const cruises = loadClientCruises();

  if (key === "hot-deals") {
    return pickHotDeals(cruises).map((deal) => {
      const match = cruises.find((cruise) => String(cruise.key) === deal.id);
      return {
        ...curatedCardFromPick("hot-deals", {
          id: deal.id,
          company: match?.cruise_title || "",
          liner: match?.liner_slug || "",
          date: (match && nearestDate(match)) || "",
        }),
        discountPercent: deal.discountPercent,
        image: deal.image,
      };
    });
  }

  if (key === "unique-routes") {
    return pickUniqueRoutes(cruises).map((route) => {
      const match = cruises.find((cruise) => String(cruise.key) === route.id);
      return {
        ...curatedCardFromPick("unique-routes", {
          id: route.id,
          company: match?.cruise_title || route.line,
          liner: match?.liner_slug || "",
          date: (match && nearestDate(match)) || "",
        }),
        coverImage: route.coverImage,
        linerImage: route.linerImage ?? "",
      };
    });
  }

  return defaultCardsFor(key);
}
