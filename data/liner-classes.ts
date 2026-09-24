import { LinerClass } from "@/types";

export const linerClasses: LinerClass[] = [
  {
    id: "standard",
    title: "Стандарт",
    ships: [
      { name: "MSC World Europa", linerSlug: "msc-world-europa", company: "MSC Cruises" },
      { name: "MSC Meraviglia", linerSlug: "msc-meraviglia", company: "MSC Cruises" },
    ],
    image: "/images/liner-class.jpg",
  },
  {
    id: "premium",
    title: "Преміум",
    ships: [
      { name: "MSC World Europa", linerSlug: "msc-world-europa", company: "MSC Cruises" },
      { name: "MSC Meraviglia", linerSlug: "msc-meraviglia", company: "MSC Cruises" },
      { name: "Costa Toscana", linerSlug: "costa-toscana", company: "Costa Cruises" },
      { name: "Costa Diadema", linerSlug: "costa-diadema", company: "Costa Cruises" },
      { name: "Costa Smeralda", linerSlug: "costa-smeralda", company: "Costa Cruises" },
    ],
    image: "/images/liner-class.jpg",
  },
  {
    id: "luxury",
    title: "Люкс",
    ships: [
      { name: "MSC World Europa", linerSlug: "msc-world-europa", company: "MSC Cruises" },
      { name: "MSC Meraviglia", linerSlug: "msc-meraviglia", company: "MSC Cruises" },
      { name: "Costa Toscana", linerSlug: "costa-toscana", company: "Costa Cruises" },
    ],
    image: "/images/liner-class.jpg",
  },
  {
    id: "ultra-luxury",
    title: "Ультра люкс",
    ships: [
      { name: "Aqua" },
      { name: "Explora II" },
      { name: "Explora III" },
    ],
    image: "/images/liner-class.jpg",
  },
];
