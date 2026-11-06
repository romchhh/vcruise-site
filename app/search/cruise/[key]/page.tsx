import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CruiseDetailLoader from "@/components/cruise-search/CruiseDetailLoader";
import CruiseDetailSkeleton from "@/components/cruise-search/CruiseDetailSkeleton";
import JsonLd from "@/components/JsonLd";
import {
  fetchFourgatesOffers,
  mapGuestsToFourgates,
} from "@/lib/cruise-search/fourgates-offers";
import { resolveDetailCruise } from "@/lib/cruise-search/resolve-detail-cruise";
import { ownCruiseBookingUrl } from "@/lib/cruise-search/utils";
import { createMetadata } from "@/lib/seo";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

type PageProps = {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { key: keyRaw } = await params;
  const key = Number.parseInt(keyRaw, 10);
  if (!Number.isFinite(key)) {
    return createMetadata({
      title: "Круїз",
      path: "/search",
    });
  }

  const cruise = (await resolveDetailCruise(key, await searchParams))?.cruise;
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

export default async function CruiseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { key: keyRaw } = await params;
  const key = Number.parseInt(keyRaw, 10);
  if (!Number.isFinite(key)) notFound();

  const query = await searchParams;
  const pageData = await resolveDetailCruise(key, query);
  if (!pageData) notFound();
  const { cruise, similar } = pageData;

  const bookingUrl = ownCruiseBookingUrl(cruise);
  if (bookingUrl) {
    // Start the slow operator quote during the document request so the
    // client's /api/cruise-offers call joins the same in-flight request.
    void fetchFourgatesOffers(
      bookingUrl,
      mapGuestsToFourgates(2, 0, 0, 0),
    ).catch(() => {
      // The booking panel retries and shows its own error.
    });
  }

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
