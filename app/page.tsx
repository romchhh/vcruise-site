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
import { HomeDisplayCurrencyProvider } from "@/components/HomeDisplayCurrencyProvider";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLd from "@/components/JsonLd";

const CruiseFinder = dynamic(() => import("@/components/CruiseFinder"));
const PackageTours = dynamic(() => import("@/components/PackageTours"));
const PopularDestinations = dynamic(
  () => import("@/components/PopularDestinations")
);
import { createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { cmsBlock } from "@/lib/cms/content";
import { resolveSiteSettings } from "@/lib/cms/resolve-site";
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
  const site = resolveSiteSettings();
  const linerClassesSection = cmsBlock("liner-classes");
  const destinationsSection = cmsBlock("destinations");
  const packageToursSection = cmsBlock("package-tours");
  const cruiseFinderSection = cmsBlock("cruise-finder");

  return (
    <>
      <JsonLd
        data={[
          organizationSchema(),
          websiteSchema(),
          serviceSchema(),
          faqSchema(),
          webPageSchema({
            title: site.title,
            description: site.description,
            path: "/",
          }),
        ]}
      />
      <Header />
      <HashScrollHandler />
      <main>
        <Hero />
        <HomeDisplayCurrencyProvider>
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
        </HomeDisplayCurrencyProvider>
        <ScrollReveal>
          <LinerClasses section={linerClassesSection} />
        </ScrollReveal>
        <ScrollReveal>
          <PopularDestinations section={destinationsSection} />
        </ScrollReveal>
        <ScrollReveal>
          <CruiseFinder section={cruiseFinderSection} />
        </ScrollReveal>
        <ScrollReveal>
          <PackageTours section={packageToursSection} />
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
