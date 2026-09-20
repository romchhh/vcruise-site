import Image from "next/image";
import { siteConfig } from "@/lib/site";

const linkColumns = [
  {
    title: "Направлення",
    links: [
      { label: "Африка", href: "#destinations" },
      { label: "Європа", href: "#destinations" },
      { label: "Азія", href: "#destinations" },
      { label: "Арктика", href: "#destinations" },
    ],
  },
  {
    title: "Круїзи",
    links: [{ label: "Пошук круїзів", href: "#cruise-finder" }],
  },
  {
    title: "Про нас",
    links: [{ label: "Наша команда", href: "#about" }],
  },
  {
    title: "Контакти",
    links: [{ label: "+380 XX XXX XX XX", href: `tel:${siteConfig.phone}` }],
  },
];

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
              <p className="text-caption mt-3 text-white/70">
                Ваш особистий провідник у світ круїзів
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <p className="text-body text-white/80">
                Отримуйте найвигідніші пропозиції першими
              </p>
              <button type="button" className="btn-secondary shrink-0">
                Підписатись
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-10 sm:grid-cols-4 lg:py-12">
            {linkColumns.map((col) => (
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
            <p>© 2026 Cruise Agency. Усі права захищено.</p>
            <a
              href="/privacy"
              className="text-center transition-colors hover:text-white"
            >
              Політика конфіденційності
            </a>
            <a
              href="/terms"
              className="text-left transition-colors hover:text-white sm:text-right"
            >
              Умови використання
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
