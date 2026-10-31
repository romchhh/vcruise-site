import {
  FINDER_REGION_ALIASES,
  HERO_DESTINATION_REGION_IDS,
  REGION_TREE,
} from "./constants";
import {
  AFRICA_COUNTRY_CODES,
  JAPAN_COUNTRY_CODE,
  routeVisitsAnyCountry,
  routeVisitsCountry,
} from "./country-flag";
import type { CruiseRecord } from "./types";

const AFRICA_REGION_IDS = new Set(["AFR", "INW", "RED"]);
const AFRICA_REGION_ID_PATTERNS = [
  /^Africa & Indian Ocean/i,
  /^Canaries and African Atlantic/i,
] as const;

const JAPAN_REGION_TOKENS = new Set(["JPN", "Японія"]);

/**
 * Expand a UI region token (hero label, tree group, leaf id/label, finder alias)
 * into concrete region_id / region_name values that appear in cruise data.
 */
function collectRegionMatchers(region: string) {
  const ids = new Set<string>();
  const names = new Set<string>([region]);

  for (const group of REGION_TREE) {
    if (group.group === region) {
      names.add(group.group);
      for (const [id, label] of group.items) {
        ids.add(id);
        names.add(label);
      }
    }

    for (const [id, label] of group.items) {
      if (region === id || region === label) {
        ids.add(id);
        names.add(label);
      }
    }
  }

  const aliasIds =
    HERO_DESTINATION_REGION_IDS[region] ?? FINDER_REGION_ALIASES[region];

  if (aliasIds?.length) {
    for (const id of aliasIds) {
      ids.add(id);
      for (const group of REGION_TREE) {
        for (const [treeId, label] of group.items) {
          if (treeId === id) names.add(label);
        }
      }
    }
  }

  // Finder umbrella ≈ Southern Europe parent + its children.
  if (region === "Середземномор'я") {
    names.add("Південна Європа");
    for (const group of REGION_TREE) {
      if (group.group === "Південна Європа") {
        for (const [id, label] of group.items) {
          ids.add(id);
          names.add(label);
        }
      }
    }
  }

  return { ids, names };
}

function isBroadAfricaFilter(region: string) {
  return (
    region === "Африка" || region === "Африка та Індійський океан"
  );
}

function matchesAfricaCatalogRegion(cruise: CruiseRecord) {
  const regionId = cruise.region_id ?? "";
  const regionName = cruise.region_name ?? "";

  if (AFRICA_REGION_IDS.has(regionId)) return true;
  if (AFRICA_REGION_ID_PATTERNS.some((pattern) => pattern.test(regionId))) {
    return true;
  }
  if (regionName.includes("Африка") || regionName.includes("Червоне море")) {
    return true;
  }

  return routeVisitsAnyCountry(cruise.route, AFRICA_COUNTRY_CODES);
}

function isJapanRegionFilter(region: string) {
  if (JAPAN_REGION_TOKENS.has(region)) return true;
  return region === "JPN";
}

function matchesJapanCatalogRegion(cruise: CruiseRecord) {
  if (cruise.region_id === "JPN") return true;
  if ((cruise.region_name ?? "").includes("Япон")) return true;
  return routeVisitsCountry(cruise.route, JAPAN_COUNTRY_CODE);
}

export function matchesCruiseRegion(cruise: CruiseRecord, region: string) {
  if (!region) return true;

  const { ids, names } = collectRegionMatchers(region);

  if (names.has(cruise.region_name) || ids.has(cruise.region_id)) {
    return true;
  }

  if (isJapanRegionFilter(region) && matchesJapanCatalogRegion(cruise)) {
    return true;
  }

  if (isBroadAfricaFilter(region) && matchesAfricaCatalogRegion(cruise)) {
    return true;
  }

  return false;
}

export function matchesCruiseRegions(
  cruise: CruiseRecord,
  regions: string[],
) {
  if (!regions.length) return true;
  return regions.some((region) => matchesCruiseRegion(cruise, region));
}
