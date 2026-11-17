import { FINDER_REGION_ALIASES, REGION_TREE } from "./constants";
import type { CruiseRecord } from "./types";

/** Hero label that is not itself a group name in REGION_TREE. */
const HERO_GROUP_NAMES: Record<string, string> = {
  Африка: "Африка та Індійський океан",
};

/**
 * When 4gates tags a sailing only under the parent (e.g. «Азія») but the user
 * picked a child (Японія), match by itinerary keywords.
 * Missing key = parent tag alone is enough (Caribbean-style).
 */
const REGION_ROUTE_HINTS: Record<string, string[]> = {
  JPN: [
    "япон",
    "japan",
    "токіо",
    "токио",
    "tokyo",
    "йокогам",
    "yokohama",
    "осак",
    "osaka",
    "кобе",
    "kobe",
    "окінав",
    "okinawa",
    "наха",
    "naha",
    "кагосім",
    "kagoshima",
    "фукуок",
    "fukuoka",
    "хоккайд",
    "hokkaido",
    "ісігак",
    "ishigaki",
    "нагасак",
    "nagasaki",
    "хіросім",
    "hiroshima",
    "кюсю",
    "kyushu",
    "мияджим",
    "miyajima",
  ],
  UAE: [
    "дуба",
    "dubai",
    "абу-даб",
    "abu dhabi",
    "оае",
    "uae",
    "перськ",
    "arabian gulf",
    "доха",
    "doha",
    "маскат",
    "muscat",
  ],
  SEA: [
    "сінгапур",
    "singapore",
    "бангкок",
    "bangkok",
    "пхукет",
    "phuket",
    "вєтнам",
    "вьетнам",
    "vietnam",
    "хошимін",
    "ho chi",
    "нячанг",
    "nha trang",
    "гонконг",
    "hong kong",
    "балі",
    "bali",
    "benoa",
    "маніл",
    "manila",
    "таїланд",
    "thailand",
    "малайз",
    "malaysia",
    "пінанг",
    "penang",
    "лангкав",
    "langkawi",
    "камбодж",
    "cambodia",
    "сіанук",
    "sihanouk",
    "дананг",
    "danang",
    "ханой",
    "hanoi",
    "ха лонг",
    "halong",
    "тайван",
    "taiwan",
    "кілун",
    "keelung",
    "самуї",
    "samui",
    "пусан",
    "busan",
  ],
};

REGION_ROUTE_HINTS["Японія"] = REGION_ROUTE_HINTS.JPN;
REGION_ROUTE_HINTS["ОАЕ та Перська затока"] = REGION_ROUTE_HINTS.UAE;
REGION_ROUTE_HINTS["Південно-Східна Азія"] = REGION_ROUTE_HINTS.SEA;

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

function findParentGroup(region: string) {
  for (const group of REGION_TREE) {
    if (!group.group) continue;
    if (group.group === region) return group.group;
    for (const [id, label] of group.items) {
      if (region === id || region === label) return group.group;
    }
  }
  const aliasIds = FINDER_REGION_ALIASES[region];
  if (aliasIds?.length) {
    for (const group of REGION_TREE) {
      if (!group.group) continue;
      if (group.items.some(([id]) => aliasIds.includes(id))) return group.group;
    }
  }
  return null;
}

function groupChildrenSelected(groupName: string, regions: string[]) {
  const group = REGION_TREE.find((item) => item.group === groupName);
  if (!group?.group) return false;
  if (regions.includes(group.group)) return true;
  return group.items.every(
    ([id, label]) => regions.includes(id) || regions.includes(label),
  );
}

/**
 * Direct name matches for a region token (child label / group / alias).
 * Does not include parent group name for children — that is handled separately
 * so «Японія» does not match every sailing tagged only as «Азія».
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
  if (region === "Кариби") {
    addGroupLabels(names, "Карибські острови");
  }

  return names;
}

function catalogRegionName(cruise: CruiseRecord) {
  return (cruise.region_name ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMatchText(text: string) {
  return text
    .toLowerCase()
    .replace(/[`´''ʼ′]/g, "")
    .replace(/\s+/g, " ");
}

function routeHaystack(cruise: CruiseRecord) {
  return normalizeMatchText((cruise.route ?? []).join(" "));
}

function routeHintsFor(region: string): string[] | null {
  if (Object.prototype.hasOwnProperty.call(REGION_ROUTE_HINTS, region)) {
    return REGION_ROUTE_HINTS[region] ?? [];
  }
  const label = labelForTreeId(region);
  if (label && Object.prototype.hasOwnProperty.call(REGION_ROUTE_HINTS, label)) {
    return REGION_ROUTE_HINTS[label] ?? [];
  }
  return null;
}

function routeMatchesHints(cruise: CruiseRecord, region: string) {
  const hints = routeHintsFor(region);
  // No hints configured → parent tag is enough (e.g. Caribbean children).
  if (!hints) return true;
  if (!hints.length) return true;
  const haystack = routeHaystack(cruise);
  if (!haystack.trim()) return false;
  return hints.some((hint) => haystack.includes(normalizeMatchText(hint)));
}

/** True when getitems `region_id` is only a widen; client must rematch names/routes. */
export function regionsNeedClientRematch(regions: string[]) {
  if (!regions.length) return false;
  // Parent ids are merged into the request for every grouped child selection.
  return regions.some((region) => Boolean(findParentGroup(region)));
}

export function matchesCruiseRegion(
  cruise: CruiseRecord,
  region: string,
  selectedRegions: string[] = [region],
) {
  if (!region) return true;
  const regionName = catalogRegionName(cruise);
  const names = collectRegionNames(region);

  if (names.has(regionName)) return true;

  const parent = findParentGroup(region);
  if (!parent) return false;

  // User picked the whole group (or all children) → parent tag matches.
  if (region === parent || groupChildrenSelected(parent, selectedRegions)) {
    if (regionName === parent) return true;
    const parentNames = collectRegionNames(parent);
    if (parentNames.has(regionName)) return true;
  }

  // Parent-tagged sailing + child filter → require itinerary hints when defined.
  if (regionName === parent && region !== parent) {
    return routeMatchesHints(cruise, region);
  }

  return false;
}

export function matchesCruiseRegions(
  cruise: CruiseRecord,
  regions: string[],
) {
  if (!regions.length) return true;
  return regions.some((item) => matchesCruiseRegion(cruise, item, regions));
}
