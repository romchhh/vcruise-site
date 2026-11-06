import { FINDER_REGION_ALIASES, REGION_TREE } from "./constants";

/**
 * Numeric region_id values from 4gates `act=getfilter` (locale=ua).
 * Parent ids expand to the same set as selecting the group in their widget.
 */
const REGION_FILTER_IDS: Record<string, string> = {
  "Австралія та Океанія": "37",
  "Австралія та Нова Зеландія": "27",
  "Французська Полінезія, Таїті": "26",
  "Французька Полінезія, Таїті": "26",
  Азія: "22",
  "ОАЕ та Перська затока": "12",
  "Південно-Східна Азія": "33",
  Японія: "34",
  "Арктика та Гренландія": "36",
  "Африка та Індійський океан": "30",
  Африка: "30",
  "Червоне море": "31",
  "О. Індійського океану": "30",
  Бермуди: "32",
  "Гранд вояжи": "29",
  "Карибські острови": "13",
  Кариби: "13",
  "Західні Кариби": "14",
  "Кариби без віз": "17",
  "Південні Кариби": "16",
  "Східні Кариби": "15",
  "Південна Європа": "1",
  "Грецькі острови": "4",
  "Західне Середземноморья": "2",
  "Канарські острови": "5",
  "Східне Середземноморья": "3",
  "Північна Європа": "6",
  Ісландія: "10",
  Балтика: "8",
  "Британські острови": "9",
  "Норвезькі фіорди": "7",
  "Панамський Канал": "18",
  "Трансатлантичні круїзи": "25",
  Аляска: "21",
  Антарктида: "35",
  "Гавайські острови": "28",
  "Галапагоські острови": "24",
  "Мексиканська рів'єра": "19",
  "Навколо Європи": "11",
  "Південна Америка та Антарктида": "23",
  "США та Канада": "20",
  "Середземномор'я": "1",
  Європа: "6",
};

/** Tree option id → 4gates numeric region_id. */
const TREE_ID_TO_FILTER: Record<string, string> = {
  AUS: "27",
  POL: "26",
  UAE: "12",
  SEA: "33",
  JPN: "34",
  ARC: "36",
  AFR: "30",
  INW: "30",
  RED: "31",
  BER: "32",
  GV: "29",
  "CAR-W": "14",
  "CAR-NV": "17",
  "CAR-S": "16",
  "CAR-E": "15",
  GRE: "4",
  "MED-W": "2",
  CAN: "5",
  "MED-E": "3",
  ISL: "10",
  BAL: "8",
  UK: "9",
  NOR: "7",
  PAN: "18",
  AK: "21",
  ANT: "35",
  HI: "28",
  GAL: "24",
  MEX: "19",
  EUR: "11",
  SAM: "23",
  USCA: "20",
};

/** Company title → 4gates cruise_id (from getfilter). */
const COMPANY_CRUISE_IDS: Record<string, string> = {
  Amawaterways: "AMA",
  "Celebrity Cruises": "CEL",
  "Celestyal Cruises": "CLS",
  "Costa Cruises": "COS",
  "Crystal Cruises": "CCL",
  "Cunard Line": "CUN",
  "Disney Cruise Line": "DCL",
  "Explora Journeys": "EXJ",
  "Four Seasons Yachts": "FSY",
  "Holland America Line": "HAL",
  "Hurtigruten Expeditions": "HRG",
  "MSC Cruises": "MSC",
  "Norwegian Cruise Line": "NCL",
  "Oceania Cruises": "OCC",
  "Ponant Cruises": "PON",
  "Princess Cruises": "PCL",
  "Regent Seven Seas Cruises": "REG",
  "Ritz-Carlton Yacht Collection": "RITZ",
  "Royal Caribbean International": "RCC",
  "Seabourn Cruises": "SBN",
  "SilverSea Cruises": "SSC",
  "Star Clippers": "SCL",
  "Swan Hellenic Cruises": "SWH",
  "Variety Cruises": "VRC",
  "Viking Cruises": "VOC",
  "Virgin Voyages": "VRV",
};

function addRegionFilterId(ids: Set<string>, region: string) {
  const direct = REGION_FILTER_IDS[region];
  if (direct) {
    ids.add(direct);
    return;
  }

  for (const group of REGION_TREE) {
    if (group.group === region) {
      const groupId = REGION_FILTER_IDS[region];
      if (groupId) ids.add(groupId);
      return;
    }
    for (const [treeId, label] of group.items) {
      if (region === treeId || region === label) {
        const mapped = TREE_ID_TO_FILTER[treeId] ?? REGION_FILTER_IDS[label];
        if (mapped) ids.add(mapped);
        return;
      }
    }
  }

  const aliases = FINDER_REGION_ALIASES[region];
  if (!aliases) return;
  for (const treeId of aliases) {
    const mapped = TREE_ID_TO_FILTER[treeId];
    if (mapped) ids.add(mapped);
  }
}

/** Comma-joined 4gates region_id list for getitems, or empty. */
export function resolveFourgatesRegionIds(regions: string[]) {
  const ids = new Set<string>();
  for (const region of regions) {
    if (!region || region === "Будь-який") continue;
    addRegionFilterId(ids, region);
  }
  return [...ids].join(",");
}

export function resolveFourgatesCruiseIdFromTitle(company: string) {
  if (!company) return "";
  return COMPANY_CRUISE_IDS[company] ?? "";
}
