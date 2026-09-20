import { OnboardFeature } from "@/types";

export const onboardFeatures: OnboardFeature[] = [
  {
    id: "cabin",
    title: "Простір для відпочинку",
    description:
      "Затишні каюти та люкси, панорамні вікна і час, коли нікуди не потрібно поспішати.",
    image: "/images/cruise-card.jpg",
  },
  {
    id: "food",
    title: "Гастрономія",
    description: "Ресторани, нові смаки та вечері з видом на море.",
    image: "/images/cta-deck.jpg",
  },
  {
    id: "leisure",
    title: "Розваги та відпочинок",
    description:
      "Басейни, SPA, спорт, вечірні шоу та активності на будь-який настрій.",
    image: "/images/liner-class.jpg",
  },
  {
    id: "excursions",
    title: "Екскурсії",
    description:
      "Щодня нове місто, острів або країна і можливість побачити більше, ніж просто порт.",
    image: "/images/cruise-finder.jpg",
  },
];
