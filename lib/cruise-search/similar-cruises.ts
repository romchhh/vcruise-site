import { hasBookableDates } from "./utils";
import type { CruiseRecord } from "./types";

function similarityScore(base: CruiseRecord, candidate: CruiseRecord) {
  let score = 0;

  if (base.region_id && candidate.region_id === base.region_id) score += 4;
  else if (
    base.region_name &&
    candidate.region_name === base.region_name
  ) {
    score += 3;
  }

  if (base.cruise_title && candidate.cruise_title === base.cruise_title) {
    score += 3;
  }

  if (base.liner_slug && candidate.liner_slug === base.liner_slug) {
    score += 2;
  }

  const nightsBase = base.nights ?? 0;
  const nightsCand = candidate.nights ?? 0;
  const nightDiff = Math.abs(nightsBase - nightsCand);
  if (nightDiff === 0) score += 2;
  else if (nightDiff <= 2) score += 1;

  if (base.port_from_id && candidate.port_from_id === base.port_from_id) {
    score += 1;
  }

  return score;
}

export function findSimilarCruises(
  cruise: CruiseRecord,
  all: CruiseRecord[],
  limit = 3,
): CruiseRecord[] {
  return all
    .filter((item) => item.key !== cruise.key && hasBookableDates(item))
    .map((item) => ({ item, score: similarityScore(cruise, item) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
