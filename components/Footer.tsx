import Image from "next/image";
import FooterSubscribe from "@/components/footer/FooterSubscribe";
import {
  footerLegal,
  footerLinkColumns,
  footerTagline,
} from "@/lib/footer";
import { siteConfig } from "@/lib/site";

export default function Footer() {
  return (
    <footer id="footer" className="section-frame">
      <div className="overflow-hidden rounded-shell bg-[color:var(--color-brand)] text-white">
        <div className="container-px mx-auto max-w-[1400px]">
          <div className="flex flex-col gap-8 border-b border-white/15 py-10 lg:flex-row lg:items-center lg:justify-between lg:py-12">
            <div>
              <Image
                src="/VCRUISE.svg"
                alt={siteConfig.name}
                width={104}
                height={15}
                className="h-[18px] w-auto"
              />
              <p className="text-caption mt-3 text-white/70">{footerTagline}</p>
            </div>

            <FooterSubscribe />
          </div>

          <div className="grid grid-cols-2 gap-8 py-10 sm:grid-cols-4 lg:py-12">
            {footerLinkColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-body font-semibold text-white">
                  {col.title}
                </h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-caption text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-white/15 py-6 text-caption text-white/55 sm:grid-cols-3 sm:items-center">
            <p className="text-center sm:text-left">{footerLegal.copyright}</p>
            <a
              href={footerLegal.privacy.href}
              className="text-center transition-colors hover:text-white sm:text-center"
            >
              {footerLegal.privacy.label}
            </a>
            <a
              href={footerLegal.terms.href}
              className="text-center transition-colors hover:text-white sm:text-right"
            >
              {footerLegal.terms.label}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
