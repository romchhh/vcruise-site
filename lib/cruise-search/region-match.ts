import {
  FINDER_REGION_ALIASES,
  HERO_DESTINATION_REGION_IDS,
  REGION_TREE,
} from "./constants";
import type { CruiseRecord } from "./types";

export function matchesCruiseRegion(cruise: CruiseRecord, region: string) {
  if (!region) return true;

  if (cruise.region_name === region || cruise.region_id === region) {
    return true;
  }

  for (const group of REGION_TREE) {
    for (const [id, label] of group.items) {
      if (region === id || region === label) {
        if (cruise.region_id === id || cruise.region_name === label) {
          return true;
        }
      }
    }
  }

  const heroIds = HERO_DESTINATION_REGION_IDS[region];
  const finderIds = FINDER_REGION_ALIASES[region];
  const ids = heroIds ?? finderIds;

  if (!ids?.length) return false;

  return (
    ids.includes(cruise.region_id) ||
    ids.some((id) => cruise.region_name.includes(id))
  );
}
