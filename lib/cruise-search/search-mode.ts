import type { CruiseSearchFilters } from "./types";

/** Search results always come from live 4gates getitems (file catalog is for defaults only). */
export function shouldUseLiveCatalogSearch(
  _filters: CruiseSearchFilters,
  _listQuery: string,
) {
  return true;
}
