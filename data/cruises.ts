import { Cruise } from "@/types";

export const nearestCruises: Cruise[] = Array.from({ length: 6 }).map(
  (_, i) => ({
    id: `cruise-${i + 1}`,
    region: "Середземномор'я",
    line: "Costa Cruises",
    title: "Класичний круїз: Барселона — Рим",
    route: "Барселона → Чівітавеккія",
    dateRange: "12.09.26 – 19.09.26",
    nights: 7,
    price: 2450,
    image: "/images/cruise-card.jpg",
  })
);
