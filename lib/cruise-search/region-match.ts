import {
  FINDER_REGION_ALIASES,
  HERO_DESTINATION_REGION_IDS,
  REGION_TREE,
} from "./constants";
import type { CruiseRecord } from "./types";

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

export function matchesCruiseRegion(cruise: CruiseRecord, region: string) {
  if (!region) return true;

  const { ids, names } = collectRegionMatchers(region);

  if (names.has(cruise.region_name) || ids.has(cruise.region_id)) {
    return true;
  }

  // Legacy soft match: some region_ids are English phrases containing tree ids.
  for (const id of ids) {
    if (id.length >= 3 && cruise.region_id.includes(id)) return true;
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
