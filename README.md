# VCRUISE — лендінг круїзного агентства

Проєкт на Next.js 15 (App Router) + React + TypeScript + Tailwind CSS v4, що
відтворює наданий дизайн-макет: хедер, hero з пошуковою панеллю, найближчі
круїзи, "Життя на борту", популярні напрямки, форма підбору круїзу, пакетні
тури, блок "Про нас", CTA-секція та футер.

## Стек

- Next.js 15 (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS v4 (дизайн-токени через `@theme` у `app/globals.css`)
- lucide-react — іконки

## Фото

Усі зображення — стокові плейсхолдери з LoremFlickr, підібрані за ключовими
словами під тематику кожного блоку (круїзи, узбережжя, готелі тощо), щоб
верстку було зручно оцінити вже зараз. Перед запуском у продакшн замініть їх
на реальні фото клієнта:

- `data/cruises.ts` — картки найближчих круїзів
- `data/tours.ts` — картки пакетних турів
- `data/destinations.ts` — популярні напрямки
- `data/onboard.ts` — секція "Життя на борту"
- `components/Hero.tsx`, `components/CruiseFinder.tsx`,
  `components/AboutUs.tsx`, `components/CTASection.tsx` — точкові фото

Найпростіше — відредагувати виклики `stockPhoto(...)` (файл
`lib/stock-image.ts`) або одразу підставити прямі посилання/локальні файли з
`public/`.

## Запуск

```bash
npm install
npm run dev
```

Відкрити http://localhost:3000

## Продакшн-білд

```bash
npm run build
npm run start
```

## Структура

```
app/                 — сторінки App Router (layout, page, globals.css)
components/          — усі секції лендінгу (Header, Hero, картки, Footer...)
data/                — мокові дані (круїзи, тури, напрямки)
lib/                 — допоміжні функції (генерація фото-URL)
types/                — спільні TypeScript-типи
```
