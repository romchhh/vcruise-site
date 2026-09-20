import type { CurrencyCode } from "./types";

export const SEARCH_RESULTS_PAGE_SIZE = 12;

/** Лайнери, спущені з цього року, вважаються «новими». */
export const NEW_LINER_MIN_BUILT_YEAR = 2020;

export const CABIN_ORDER = ["Внутрішня", "З вікном", "З балконом", "Сьют"] as const;

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  NAT: "₴",
  USD: "$",
  EUR: "€",
};

export const MONTH_LABELS = [
  "Січ",
  "Лют",
  "Бер",
  "Квіт",
  "Трав",
  "Черв",
  "Лип",
  "Серп",
  "Вер",
  "Жовт",
  "Лист",
  "Груд",
] as const;

export const MONTH_INDEX: Record<string, number> = {
  Січ: 0,
  Лют: 1,
  Бер: 2,
  Квіт: 3,
  Трав: 4,
  Черв: 5,
  Лип: 6,
  Серп: 7,
  Вер: 8,
  Жовт: 9,
  Лист: 10,
  Груд: 11,
};

export const HERO_DESTINATIONS = [
  "Будь-який",
  "Південна Європа",
  "Північна Європа",
  "Африка",
  "Азія",
  "Австралія та Океанія",
  "Трансатлантичні круїзи",
] as const;

export const HERO_DURATION_OPTIONS = [
  "Будь-яка",
  "1-7 ночей",
  "8-14 ночей",
  "15-21 ночей",
  "22+ ночей",
] as const;

export const FINDER_REGION_ALIASES: Record<string, string[]> = {
  "Середземномор'я": ["GRE", "MED-W", "CAN", "MED-E"],
  Кариби: ["CAR-W", "CAR-NV", "CAR-S", "CAR-E"],
  Європа: ["ISL", "BAL", "UK", "NOR", "EUR"],
  Аляска: ["AK"],
  Інше: [],
};

export const HERO_DESTINATION_REGION_IDS: Record<string, string[]> = {
  "Південна Європа": ["GRE", "MED-W", "CAN", "MED-E"],
  "Північна Європа": ["ISL", "BAL", "UK", "NOR"],
  Африка: ["RED"],
  Азія: ["UAE", "SEA", "JPN", "Asian Cruises"],
  "Австралія та Океанія": ["AUS", "POL"],
  "Трансатлантичні круїзи": [
    "AK",
    "ANT",
    "HI",
    "GAL",
    "MEX",
    "EUR",
    "SAM",
    "USCA",
    "ARC",
    "GV",
    "PAN",
    "BER",
  ],
};

export const REGION_TREE = [
  {
    group: "Австралія та Океанія",
    items: [
      ["AUS", "Австралія та Нова Зеландія"],
      ["POL", "Французька Полінезія, Таїті"],
    ],
  },
  {
    group: "Азія",
    items: [
      ["UAE", "ОАЕ та Перська затока"],
      ["SEA", "Південно-Східна Азія"],
      ["JPN", "Японія"],
    ],
  },
  { group: null, items: [["ARC", "Арктика та Гренландія"]] },
  {
    group: "Африка та Індійський океан",
    items: [["RED", "Червоне море"]],
  },
  { group: null, items: [["BER", "Бермуди"]] },
  { group: null, items: [["GV", "Гранд вояжи"]] },
  {
    group: "Карибські острови",
    items: [
      ["CAR-W", "Західні Кариби"],
      ["CAR-NV", "Кариби без віз"],
      ["CAR-S", "Південні Кариби"],
      ["CAR-E", "Східні Кариби"],
    ],
  },
  {
    group: "Південна Європа",
    items: [
      ["GRE", "Грецькі острови"],
      ["MED-W", "Західне Середземноморья"],
      ["CAN", "Канарські острови"],
      ["MED-E", "Східне Середземноморья"],
    ],
  },
  {
    group: "Північна Європа",
    items: [
      ["ISL", "Ісландія"],
      ["BAL", "Балтика"],
      ["UK", "Британські острови"],
      ["NOR", "Норвезькі фіорди"],
    ],
  },
  { group: null, items: [["PAN", "Панамський Канал"]] },
  {
    group: "Трансатлантичні круїзи",
    items: [
      ["AK", "Аляска"],
      ["ANT", "Антарктида"],
      ["HI", "Гавайські острови"],
      ["GAL", "Галапагоські острови"],
      ["MEX", "Мексиканська рів'єра"],
      ["EUR", "Навколо Європи"],
      ["SAM", "Південна Америка та Антарктида"],
      ["USCA", "США та Канада"],
    ],
  },
] as const;
