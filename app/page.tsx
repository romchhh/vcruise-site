import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Header from "@/components/Header";
import LinerClasses from "@/components/LinerClasses";
import NearestCruises from "@/components/NearestCruises";
import CruiseFinder from "@/components/CruiseFinder";
import AboutUs from "@/components/AboutUs";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import PackageTours from "@/components/PackageTours";
import PopularDestinations from "@/components/PopularDestinations";
import HashScrollHandler from "@/components/HashScrollHandler";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLd from "@/components/JsonLd";
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
          <NearestCruises />
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
