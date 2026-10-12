import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Hero from "@/components/Hero";
import Header from "@/components/Header";
import LinerClasses from "@/components/LinerClasses";
import HotDeals from "@/components/HotDeals";
import HotDealsSkeleton from "@/components/HotDealsSkeleton";
import UniqueRoutes from "@/components/UniqueRoutes";
import UniqueRoutesSkeleton from "@/components/UniqueRoutesSkeleton";
import AboutUs from "@/components/AboutUs";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import HashScrollHandler from "@/components/HashScrollHandler";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLd from "@/components/JsonLd";

const CruiseFinder = dynamic(() => import("@/components/CruiseFinder"));
const PackageTours = dynamic(() => import("@/components/PackageTours"));
const PopularDestinations = dynamic(
  () => import("@/components/PopularDestinations")
);
import { createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import {
  faqSchema,
  organizationSchema,
  serviceSchema,
  webPageSchema,
  websiteSchema,
} from "@/lib/schema";

export const metadata: Metadata = createMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          organizationSchema(),
          websiteSchema(),
          serviceSchema(),
          faqSchema(),
          webPageSchema({
            title: siteConfig.title,
            description: siteConfig.description,
            path: "/",
          }),
        ]}
      />
      <Header />
      <HashScrollHandler />
      <main>
        <Hero />
        <ScrollReveal>
          <Suspense fallback={<HotDealsSkeleton />}>
            <HotDeals />
          </Suspense>
        </ScrollReveal>
        <ScrollReveal>
          <Suspense fallback={<UniqueRoutesSkeleton />}>
            <UniqueRoutes />
          </Suspense>
        </ScrollReveal>
        <ScrollReveal>
          <LinerClasses />
        </ScrollReveal>
        <ScrollReveal>
          <PopularDestinations />
        </ScrollReveal>
        <ScrollReveal>
          <CruiseFinder />
        </ScrollReveal>
        <ScrollReveal>
          <PackageTours />
        </ScrollReveal>
        <ScrollReveal>
          <AboutUs />
        </ScrollReveal>
        <ScrollReveal>
          <CTASection />
        </ScrollReveal>
      </main>
      <ScrollReveal>
        <Footer />
      </ScrollReveal>
    </>
  );
}
