export const siteConfig = {
  name: "VCRUISE",
  legalName: "VCruise Agency",
  title: "VCRUISE — Відкрийте океан можливостей",
  description:
    "VCRUISE — ваш особистий турагент у світі круїзів. Підбір круїзів, пакетні тури, візова підтримка та повний супровід подорожі від першого дзвінка до повернення додому.",
  shortDescription:
    "Круїзне агентство в Україні: підбір круїзів, пакетні тури та супровід подорожі.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://vcruise.ua",
  locale: "uk_UA",
  language: "uk",
  email: "hello@vcruise.ua",
  phone: "+380000000000",
  address: {
    streetAddress: "Київ",
    addressLocality: "Київ",
    addressCountry: "UA",
  },
  social: {
    instagram: "https://www.instagram.com/vcruise",
    facebook: "https://www.facebook.com/vcruise",
  },
  keywords: [
    "круїзи",
    "круїзне агентство",
    "круїзи з України",
    "круїзи Середземномор'я",
    "круїзи Кариби",
    "пакетні тури",
    "круїзні лайнери",
    "Costa Cruises",
    "MSC Cruises",
    "подорожі морем",
    "круїзи 2026",
    "підбір круїзу",
    "круїзне агентство Київ",
    "VCRUISE",
  ],
  ogImage: "/images/hero.jpg",
  ogImageAlt: "Круїзний лайнер VCRUISE на заході сонця",
  themeColor: "#066e79",
  faq: [
    {
      question: "Чим VCRUISE відрізняється від звичайного бронювання круїзу?",
      answer:
        "Ми не просто продаємо круїзи з каталогу — допомагаємо підібрати маршрут, каюту та формат відпочинку, супроводжуємо на всіх етапах і допомагаємо з документами.",
    },
    {
      question: "Які напрямки круїзів доступні?",
      answer:
        "Середземномор'я, Кариби, Північна та Південна Європа, Азія, Африка, Аляска та трансатлантичні маршрути.",
    },
    {
      question: "Чи допомагаєте з візами та документами?",
      answer:
        "Так, ми працюємо з консультантами та допомагаємо підготувати необхідні документи для подорожі.",
    },
    {
      question: "Чи можна замовити пакетний тур разом із круїзом?",
      answer:
        "Так, ми формуємо пакетні тури з проживанням, перельотами, трансферами та екскурсіями.",
    },
  ],
} as const;

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}
