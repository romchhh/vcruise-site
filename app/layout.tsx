import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import ContactModalProvider from "@/components/contact/ContactModalProvider";
import { createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = createMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteConfig.themeColor },
    { media: "(prefers-color-scheme: dark)", color: siteConfig.themeColor },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`${manrope.variable} ${manrope.className} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-[color:var(--color-ink)]">
        <ContactModalProvider>{children}</ContactModalProvider>
      </body>
    </html>
  );
}
