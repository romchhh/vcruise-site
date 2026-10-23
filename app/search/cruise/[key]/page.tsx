import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CruiseDetailLoader from "@/components/cruise-search/CruiseDetailLoader";
import CruiseDetailSkeleton from "@/components/cruise-search/CruiseDetailSkeleton";
import JsonLd from "@/components/JsonLd";
import { loadCruisePage, loadCruises } from "@/lib/cruise-search/load-cruises";
import { createMetadata } from "@/lib/seo";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

type PageProps = {
  params: Promise<{ key: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { key: keyRaw } = await params;
  const key = Number.parseInt(keyRaw, 10);
  if (!Number.isFinite(key)) {
    return createMetadata({
      title: "Круїз",
      path: "/search",
    });
  }

  const cruise = loadCruises().find((item) => item.key === key);
  const title = cruise?.liner_name
    ? `${cruise.liner_name} — бронювання`
    : "Круїз";

  return createMetadata({
    title,
    description: cruise
      ? `Забронюйте ${cruise.liner_name} (${cruise.cruise_title}). Маршрут, дати та тарифи кают.`
      : "Деталі круїзу та бронювання на VCRUISE.",
    path: `/search/cruise/${key}`,
  });
}

export default async function CruiseDetailPage({ params }: PageProps) {
  const { key: keyRaw } = await params;
  const key = Number.parseInt(keyRaw, 10);
  if (!Number.isFinite(key)) notFound();

  const pageData = loadCruisePage(key);
  if (!pageData) notFound();
  const { cruise, similar } = pageData;

  const title = cruise.liner_name || "Круїз";

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            title,
            description: `Бронювання круїзу ${cruise.cruise_title}.`,
            path: `/search/cruise/${key}`,
          }),
          breadcrumbSchema([
            { name: "Головна", path: "/" },
            { name: "Пошук круїзів", path: "/search" },
            { name: title, path: `/search/cruise/${key}` },
          ]),
        ]}
      />
      <Header forceSolid />
      <Suspense fallback={<CruiseDetailSkeleton />}>
        <CruiseDetailLoader cruise={cruise} similarCruises={similar} />
      </Suspense>
      <Footer />
    </>
  );
}
