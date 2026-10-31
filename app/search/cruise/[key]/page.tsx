import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import CruiseDetailLoader from "@/components/cruise-search/CruiseDetailLoader";
import CruiseDetailSkeleton from "@/components/cruise-search/CruiseDetailSkeleton";
import JsonLd from "@/components/JsonLd";
import { loadCruisePage, loadCruises } from "@/lib/cruise-search/load-cruises";
import { findItineraryForSailing } from "@/lib/cruise-search/utils";
import { createMetadata } from "@/lib/seo";
import { breadcrumbSchema, webPageSchema } from "@/lib/schema";

type PageProps = {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function detailHref(
  key: number,
  query: Record<string, string | string[] | undefined>,
  sailing?: string,
) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    const text = pickParam(value);
    if (text) params.set(name, text);
  }
  if (sailing) params.set("sailing", sailing);
  else params.delete("sailing");
  const search = params.toString();
  return search ? `/search/cruise/${key}?${search}` : `/search/cruise/${key}`;
}

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

export default async function CruiseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { key: keyRaw } = await params;
  const key = Number.parseInt(keyRaw, 10);
  if (!Number.isFinite(key)) notFound();

  const query = await searchParams;
  const sailing = pickParam(query.sailing);
  const pageData = loadCruisePage(key);
  if (!pageData) notFound();
  const { cruise, similar } = pageData;

  if (sailing && sailing !== cruise.base_date_start) {
    const owner = findItineraryForSailing(
      loadCruises(),
      cruise.liner_slug,
      sailing,
      cruise.nights,
    );
    if (owner && owner.key !== cruise.key) {
      redirect(detailHref(owner.key, query, owner.base_date_start));
    }
    redirect(detailHref(cruise.key, query));
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
