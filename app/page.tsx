import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Hero from "@/components/Hero";
import Header from "@/components/Header";
import LinerClasses from "@/components/LinerClasses";
import NearestCruises from "@/components/NearestCruises";
import NearestCruisesSkeleton from "@/components/NearestCruisesSkeleton";
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
          <Suspense fallback={<NearestCruisesSkeleton />}>
            <NearestCruises />
          </Suspense>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <LinerClasses />
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <PopularDestinations />
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <CruiseFinder />
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <PackageTours />
        </ScrollReveal>
        <ScrollReveal>
          <AboutUs />
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <CTASection />
        </ScrollReveal>
      </main>
      <ScrollReveal>
        <Footer />
      </ScrollReveal>
    </>
  );
}
