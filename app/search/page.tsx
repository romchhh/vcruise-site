import type { Metadata } from "next";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CruiseSearchApp from "@/components/cruise-search/CruiseSearchApp";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Пошук круїзів",
  description:
    "Знайдіть круїз серед пропозицій MSC, Costa, Royal Caribbean, Norwegian, Celebrity, Viking та інших провідних компаній.",
  path: "/search",
  keywords: [
    "пошук круїзів",
    "круїзи Україна",
    "MSC Cruises",
    "Costa Cruises",
    "Royal Caribbean",
  ],
});

export default function SearchPage() {
  const cruises = loadClientCruises();

  return (
    <>
      <Header forceSolid />
      <Suspense
        fallback={
          <main className="bg-background pb-16 pt-28">
            <div className="container-px mx-auto max-w-[1180px] py-20 text-center text-body text-subtitle">
              Завантаження пошуку...
            </div>
          </main>
        }
      >
        <CruiseSearchApp cruises={cruises} />
      </Suspense>
      <Footer />
    </>
  );
}
