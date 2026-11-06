import { resolveFourgatesCruiseIdFromTitle } from "./fourgates-ids";
import { loadFourgatesFilterMeta } from "./fourgates-filter-meta";

/** 4gates `ship_id` for getitems (e.g. MA_MSC). Empty if unknown. */
export async function resolveFourgatesShipId(
  linerSlug: string,
  companyTitle = "",
) {
  const slug = linerSlug.trim().toLowerCase();
  if (!slug) return "";

  try {
    const { shipsBySlug } = await loadFourgatesFilterMeta();
    const direct = shipsBySlug.get(slug);
    const cruiseId = resolveFourgatesCruiseIdFromTitle(companyTitle);

    if (direct) {
      if (!cruiseId || direct.cruiseId === cruiseId) return direct.shipId;
    }

    for (const ship of shipsBySlug.values()) {
      if (cruiseId && ship.cruiseId !== cruiseId) continue;
      if (
        slug === ship.slug ||
        slug.endsWith(`-${ship.slug}`) ||
        ship.slug.endsWith(slug)
      ) {
        return ship.shipId;
      }
      if (slug.replace(/_/g, "-") === ship.slug) return ship.shipId;
    }
  } catch {
    return "";
  }

  return "";
}
