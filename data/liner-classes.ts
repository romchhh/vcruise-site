import { LinerClass, LinerClassLogo } from "@/types";

const mediaBase = "/images/cruises";

/** Медіа класів: `public/images/cruises/{folder}/cover.png`, `gallery/`, `logos/`. */
function cruiseMedia(
  folder: string,
  galleryFiles: string[],
  logos: { file: string; alt: string }[]
): Pick<LinerClass, "image" | "gallery" | "logos"> {
  const logoEntries: LinerClassLogo[] = logos.map(({ file, alt }) => ({
    src: `${mediaBase}/${folder}/logos/${file}`,
    alt,
  }));

  return {
    image: `${mediaBase}/${folder}/cover.png`,
    gallery: galleryFiles.map((file) => `${mediaBase}/${folder}/gallery/${file}`),
    logos: logoEntries,
  };
}

export const linerClasses: LinerClass[] = [
  {
    id: "standard",
    title: "Стандарт",
    modalHeadline:
      "Великі круїзні лайнери – окремий світ із безліччю розваг, ресторанів і активностей для всієї родини за доступною ціною.",
    modalDescription: [
      "Стандарт — це найпопулярніший формат круїзного відпочинку, створений для масового туриста. Великі лайнери, розраховані на понад 2000 пасажирів, пропонують все необхідне для яскравої відпустки: аквапарки, шоу, дитячі клуби та десятки ресторанів і барів — тут завжди є чим зайнятися всією родиною.",
      "Це оптимальний вибір для тих, хто цінує доступну ціну, різноманітність розваг і невимушену, дружню атмосферу на борту.",
    ],
    popularLiners: [
      "MSC World Europa",
      "Norwegian Viva",
      "Aqua",
      "Icon of the Seas",
      "Royal Caribbean Star of the Seas",
    ],
    ships: [
      {
        name: "MSC World Europa",
        linerSlug: "msc-world-europa",
        company: "MSC Cruises",
      },
      { name: "Norwegian Viva" },
      { name: "Aqua" },
      {
        name: "Icon of the Seas",
        linerSlug: "icon-of-the-seas",
        company: "Royal Caribbean International",
      },
      {
        name: "Royal Caribbean Star of the Seas",
        linerSlug: "star-of-the-seas",
        company: "Royal Caribbean International",
      },
    ],
    ...cruiseMedia(
      "standard",
      ["01.jpg", "02.png", "03.png", "04.png", "05.png"],
      [
        { file: "01.png", alt: "MSC Cruises" },
        { file: "02.png", alt: "Costa Cruises" },
        { file: "03.png", alt: "Royal Caribbean International" },
        { file: "04.png", alt: "Norwegian Cruise Line" },
        { file: "05.png", alt: "Disney Cruise Line" },
      ]
    ),
  },
  {
    id: "premium",
    title: "Преміум",
    modalHeadline:
      "Підвищений комфорт, високий рівень сервісу та більше вражень від самої подорожі.",
    modalDescription: [
      "Круїзи класу Преміум проходять на лайнерах середнього розміру з меншою кількістю пасажирів, просторішими каютами та більш персоналізованим сервісом. Особлива увага приділяється вишуканій кухні, ресторанам, лаунж-зонам, культурним програмам і спокійній атмосфері на борту.",
      "Маршрути зазвичай тривають від 7–14 днів і охоплюють не лише популярні напрямки, а й менш туристичні порти з довшими стоянками. Такий формат підійде парам, індивідуальним мандрівникам і тим, хто цінує комфорт, якісний сервіс, гастрономію та можливість глибше знайомитися з кожним напрямком.",
    ],
    popularLiners: ["Celebrity Xcel", "Sun Princess", "Brilliant Lady"],
    ships: [
      {
        name: "Celebrity Xcel",
        linerSlug: "celebrity-xcel",
        company: "Celebrity Cruises",
      },
      { name: "Sun Princess", linerSlug: "sun-princess", company: "Princess Cruises" },
      { name: "Brilliant Lady", linerSlug: "brilliant-lady", company: "Virgin Voyages" },
    ],
    ...cruiseMedia(
      "premium",
      ["01.png", "02.png", "03.png", "04.png", "05.png"],
      [
        { file: "01.png", alt: "Celebrity Cruises" },
        { file: "02.png", alt: "Princess Cruises" },
        { file: "03.jpg", alt: "Virgin Voyages" },
        { file: "04.png", alt: "Holland America Line" },
      ]
    ),
  },
  {
    id: "luxury",
    title: "Люкс",
    modalHeadline:
      "Максимальний рівень комфорту, приватності та персоналізованого сервісу.",
    modalDescription: [
      "Круїзи класу Люкс проходять переважно на невеликих ексклюзивних лайнерах із обмеженою кількістю гостей. На борту — просторі сюйти з балконами, високий рівень персонального обслуговування, вишукана гастрономія та спокійна камерна атмосфера. Часто круїзи працюють за системою «все включено», до якої можуть входити напої, чайові та окремі екскурсії.",
      "Завдяки компактним розмірам лайнери можуть заходити до невеликих портів, недоступних для великих суден, та пропонувати більш рідкісні й екзотичні маршрути. Такий формат створений для мандрівників, які цінують приватність, індивідуальний підхід, бездоганний сервіс і унікальні враження від подорожі.",
    ],
    popularLiners: [
      "Silver Origin",
      "Explora I",
      "Explora II",
      "Queen Anne",
      "Seven Seas Prestige",
    ],
    ships: [
      { name: "Silver Origin", linerSlug: "silver-origin", company: "Silversea" },
      { name: "Explora I", linerSlug: "explora-i", company: "Explora Journeys" },
      { name: "Explora II", linerSlug: "explora-ii", company: "Explora Journeys" },
      { name: "Queen Anne", linerSlug: "queen-anne", company: "Cunard" },
      { name: "Seven Seas Prestige" },
    ],
    ...cruiseMedia(
      "luxury",
      ["01.png", "02.png", "03.png", "04.png", "05.jpg", "06.png", "07.png"],
      [
        { file: "01.png", alt: "Silversea" },
        { file: "02.png", alt: "Explora Journeys" },
        { file: "03.png", alt: "Cunard" },
        { file: "04.png", alt: "Regent Seven Seas Cruises" },
      ]
    ),
  },
  {
    id: "ultra-luxury",
    title: "Ультра люкс",
    modalHeadline:
      "Ексклюзивний формат подорожей з атмосферою приватної яхти та найвищим рівнем персонального сервісу.",
    modalDescription: [
      "Круїзи класу Ультра Люкс проходять на невеликих суднах і мега-яхтах із обмеженою кількістю гостей. Тут поєднуються високий рівень комфорту, приватність, персоналізоване обслуговування та більш неформальна, розслаблена атмосфера. Особлива увага приділяється гастрономії, просторим сюітам і відпочинку далеко від масового туризму.",
      "Компактні розміри суден дозволяють заходити до віддалених островів, невеликих портів і затишних бухт, недоступних великим лайнерам. Багато яхт також пропонують прямий доступ до води, снорклінг, каякінг та інші водні активності. Такий формат підійде тим, хто шукає максимальну приватність, унікальні маршрути та атмосферу подорожі на власній яхті.",
    ],
    popularLiners: [
      "Le Commandant",
      "Seabourn Venture",
      "Ilma (Ritz-Carlton)",
      "SH Diana",
    ],
    ships: [
      { name: "Le Commandant", linerSlug: "le-commandant", company: "Ponant" },
      { name: "Seabourn Venture", linerSlug: "seabourn-venture", company: "Seabourn" },
      { name: "Ilma (Ritz-Carlton)" },
      { name: "SH Diana", linerSlug: "sh-diana", company: "Swan Hellenic" },
    ],
    ...cruiseMedia(
      "ultra-luxury",
      ["01.png", "02.png", "03.png", "04.png", "05.png"],
      [
        { file: "01.jpg", alt: "Ponant" },
        { file: "02.png", alt: "Seabourn" },
        { file: "03.png", alt: "The Ritz-Carlton Yacht Collection" },
        { file: "04.png", alt: "Swan Hellenic" },
      ]
    ),
  },
];
