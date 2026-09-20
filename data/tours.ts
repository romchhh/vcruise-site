import { PackageTour } from "@/types";

const barcelonaTour: Omit<PackageTour, "id"> = {
  region: "Середземномор'я",
  city: "Барселона, Іспанія",
  hotel: "Hotel Arts Barcelona",
  rating: 5,
  reviewScore: 9.2,
  reviewCount: 1248,
  reviewLabel: "Чудово",
  dateRange: "12.09.26 – 19.09.26",
  nights: 7,
  meals: "Сніданки",
  room: "Deluxe Sea View",
  guests: "2 дорослих",
  bed: "King-size",
  price: 2450,
  image: "/images/package-tours/barcelona/cover.jpg",
  gallery: [
    "/images/package-tours/barcelona/main.jpg",
    "/images/package-tours/barcelona/gallery-1.jpg",
    "/images/package-tours/barcelona/gallery-2.jpg",
    "/images/package-tours/barcelona/gallery-3.jpg",
    "/images/package-tours/barcelona/gallery-4.jpg",
    "/images/package-tours/barcelona/gallery-5.jpg",
  ],
  about:
    "П'ятизірковий готель на березі моря з панорамним видом, басейном, рестораном і центральним розташуванням поруч із пляжем і головними атракціями Барселони.",
  amenities: ["Wi-Fi", "Басейн", "Ресторан", "Фітнес-зал", "Кондиціонер"],
  included: [
    "Проживання 7 ночей",
    "Номер Deluxe Sea View",
    "Сніданки",
    "Трансфер",
    "Страхування",
  ],
};

export const packageTours: PackageTour[] = Array.from({ length: 6 }).map(
  (_, index) => ({
    id: `tour-${index + 1}`,
    ...barcelonaTour,
  })
);
