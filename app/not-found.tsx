import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { createMetadata } from "@/lib/seo";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = createMetadata({
  title: "Сторінку не знайдено — 404",
  description:
    "Запитана сторінка не існує або була переміщена. Поверніться на головну VCRUISE та продовжіть пошук круїзу.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            title: "Сторінку не знайдено",
            description:
              "Сторінка не знайдена на сайті VCRUISE. Поверніться на головну.",
            path: "/404",
          }),
          breadcrumbSchema([
            { name: "Головна", path: "/" },
            { name: "404", path: "/404" },
          ]),
        ]}
      />
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

        <header className="relative z-10 px-6 py-6 lg:px-10">
          <Link href="/" className="inline-flex">
            <Image
              src="/VCRUISE.svg"
              alt={siteConfig.name}
              width={104}
              height={15}
              className="h-[15px] w-auto lg:h-[17px]"
            />
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
            <Compass className="h-7 w-7 text-white" />
          </div>

          <p className="text-small text-white/70">Помилка 404</p>
          <h1 className="text-h1 mt-4 max-w-2xl text-white">
            Ця сторінка зникла
            <br />
            за горизонтом
          </h1>
          <p className="text-body mt-5 max-w-md text-white/75">
            Можливо, посилання застаріло або сторінку перемістили. Поверніться на
            головну та знайдіть свій наступний круїз.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              На головну
            </Link>
            <Link
              href="/#nearest-cruises"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-body font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/15"
            >
              Переглянути круїзи
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
