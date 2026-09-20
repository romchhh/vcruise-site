import { LinerClass } from "@/types";

export const linerClasses: LinerClass[] = [
  {
    id: "standard",
    title: "Стандарт",
    ships: ["MSC World Europa", "MSC Meraviglia"],
    image: "/images/liner-class.jpg",
  },
  {
    id: "premium",
    title: "Преміум",
    ships: [
      "MSC World Europa",
      "MSC Meraviglia",
      "Costa Toscana",
      "Costa Diadema",
      "Costa Smeralda",
    ],
    image: "/images/liner-class.jpg",
  },
  {
    id: "luxury",
    title: "Люкс",
    ships: ["MSC World Europa", "MSC Meraviglia", "Costa Toscana"],
    image: "/images/liner-class.jpg",
  },
  {
    id: "ultra-luxury",
    title: "Ультра люкс",
    ships: ["Aqua", "Explora II", "Explora III"],
    image: "/images/liner-class.jpg",
  },
];
