import { FINDER_REGION_ALIASES, REGION_TREE } from "./constants";
import type { CruiseRecord } from "./types";

/** Hero label that is not itself a group name in REGION_TREE. */
const HERO_GROUP_NAMES: Record<string, string> = {
  Африка: "Африка та Індійський океан",
};

function labelForTreeId(id: string) {
  for (const group of REGION_TREE) {
    for (const [treeId, label] of group.items) {
      if (treeId === id) return label;
    }
  }
  return null;
}

function addGroupLabels(names: Set<string>, groupName: string) {
  for (const group of REGION_TREE) {
    if (group.group !== groupName) continue;
    names.add(group.group);
    for (const [, label] of group.items) names.add(label);
  }
}

/**
 * 4gates region is `region_name`. Catalog `region_id` codes are not the
 * tree ids (CAN is both Canaries and US/Canada) and must not be matched.
 */
function collectRegionNames(region: string) {
  const names = new Set<string>();
  const heroGroup = HERO_GROUP_NAMES[region];
  if (heroGroup) addGroupLabels(names, heroGroup);

  for (const group of REGION_TREE) {
    if (group.group === region) addGroupLabels(names, group.group);

    for (const [id, label] of group.items) {
      if (region === id || region === label) names.add(label);
    }
  }

  const aliasIds = FINDER_REGION_ALIASES[region];
  if (aliasIds) {
    for (const id of aliasIds) {
      const label = labelForTreeId(id);
      if (label) names.add(label);
    }
  }

  if (region === "Середземномор'я") {
    addGroupLabels(names, "Південна Європа");
  }

  return names;
}

function catalogRegionName(cruise: CruiseRecord) {
  return (cruise.region_name ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesCruiseRegion(cruise: CruiseRecord, region: string) {
  if (!region) return true;
  const names = collectRegionNames(region);
  if (!names.size) return false;
  return names.has(catalogRegionName(cruise));
}

export function matchesCruiseRegions(
  cruise: CruiseRecord,
  regions: string[],
) {
  if (!regions.length) return true;
  return regions.some((item) => matchesCruiseRegion(cruise, item));
}
