export type Cruise = {
  id: string;
  region: string;
  line: string;
  title: string;
  route: string;
  dateRange: string;
  nights: number;
  price: number;
  image: string;
  href?: string;
};

export type UniqueRoute = {
  id: string;
  region: string;
  line: string;
  /** «Класичний круїз: …» */
  title: string;
  route: string;
  dateRange: string;
  nights: number;
  price: number;
  coverImage: string;
  /** Фото лайнера при наведенні; якщо немає — лишається cover */
  linerImage: string | null;
  href: string;
};

export type HotDeal = {
  id: string;
  title: string;
  route: string;
  dateRange: string;
  nights: number;
  price: number;
  originalPrice: number;
  discountPercent: number;
  image: string;
  href: string;
};

export type PackageTour = {
  id: string;
  region: string;
  city: string;
  hotel: string;
  rating: number;
  reviewScore: number;
  reviewCount: number;
  reviewLabel: string;
  dateRange: string;
  nights: number;
  meals: string;
  room: string;
  guests: string;
  bed: string;
  price: number;
  image: string;
  gallery: string[];
  about: string;
  amenities: string[];
  included: string[];
};

export type OnboardFeature = {
  id: string;
  title: string;
  description: string;
  image: string;
};

export type Destination = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  gallery: string[];
  about: string[];
  seasonality: string;
  temperature: string;
  searchLabel: string;
};

export type LinerClassShip = {
  name: string;
  linerSlug?: string;
  company?: string;
};

export type LinerClassLogo = {
  src: string;
  alt: string;
};

export type LinerClass = {
  id: string;
  title: string;
  ships: LinerClassShip[];
  image: string;
  modalHeadline: string;
  modalDescription: string[];
  popularLiners: string[];
  gallery: string[];
  logos: LinerClassLogo[];
};

export type AboutFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
};
