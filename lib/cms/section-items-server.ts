import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { pickHotDeals } from "@/lib/cruise-search/hot-deals";
import { pickUniqueRoutes } from "@/lib/cruise-search/unique-routes";
import {
  defaultCardsFor,
} from "@/lib/cms/section-items";
import type { ContentBlockCard, ContentBlockKey } from "@/lib/cms/store";

/** Live cruise picks / static defaults for admin «Підтягнути». */
export function suggestCardsFor(key: ContentBlockKey): ContentBlockCard[] {
  if (key === "hot-deals") {
    return pickHotDeals(loadClientCruises()).map((item) => ({ ...item }));
  }
  if (key === "unique-routes") {
    return pickUniqueRoutes(loadClientCruises()).map((item) => ({
      ...item,
      linerImage: item.linerImage ?? "",
    }));
  }
  return defaultCardsFor(key);
}
