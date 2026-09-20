import { OnboardFeature } from "@/types";
import { stockPhoto } from "@/lib/stock-image";

export const onboardFeatures: OnboardFeature[] = [
  {
    id: "cabin",
    title: "Простір для відпочинку",
    description:
      "Затишні каюти та люкси, панорамні вікна і час, коли нікуди не потрібно поспішати.",
    image: stockPhoto(["cruise", "cabin", "interior"], 400, 480, 201),
  },
  {
    id: "food",
    title: "Гастрономія",
    description: "Ресторани, нові смаки та вечері з видом на море.",
    image: stockPhoto(["fine dining", "restaurant"], 400, 480, 202),
  },
  {
    id: "leisure",
    title: "Розваги та відпочинок",
    description:
      "Басейни, SPA, спорт, вечірні шоу та активності на будь-який настрій.",
    image: stockPhoto(["cruise ship", "pool deck"], 400, 480, 203),
  },
  {
    id: "excursions",
    title: "Екскурсії",
    description:
      "Щодня нове місто, острів або країна і можливість побачити більше, ніж просто порт.",
    image: stockPhoto(["coastal town", "harbor"], 400, 480, 204),
  },
];
