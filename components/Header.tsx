"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useContactModal } from "@/components/contact/ContactModalProvider";
import { navLinks } from "@/lib/navigation";
import { queueScrollToSection, scrollToSection } from "@/lib/scroll-to-section";

export default function Header({ forceSolid = false }: { forceSolid?: boolean }) {
  const { openContactModal } = useContactModal();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isSolid = forceSolid || scrolled || menuOpen;

  const closeMenu = () => setMenuOpen(false);

  const handleContactClick = () => {
    closeMenu();
    openContactModal();
  };

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("#")) return;

    event.preventDefault();
    closeMenu();

    if (pathname === "/") {
      scrollToSection(href);
      return;
    }

    queueScrollToSection(href);
    router.push(`/${href}`);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className={`transition-all duration-300 ${
            isSolid ? "px-0.5 pt-0.5 md:px-1 md:pt-1" : ""
          }`}
        >
          <div
            className={`transition-all duration-300 ${
              isSolid
                ? "rounded-shell border border-[color:var(--color-line)] bg-white py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                : "bg-transparent py-5 sm:py-6 lg:py-8"
            }`}
          >
            <div className="container-px mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <Link href="/" className="relative z-10 flex-shrink-0" onClick={closeMenu}>
            <Image
              src={isSolid ? "/VCRUISE-brand.svg" : "/VCRUISE.svg"}
              alt="VCRUISE"
              width={104}
              height={15}
              priority
              className="h-[16px] w-auto sm:h-[18px] lg:h-[20px]"
            />
          </Link>

          <nav className="hidden items-center lg:flex">
            <div
              className={`flex items-center gap-7 xl:gap-8 ${
                isSolid
                  ? ""
                  : "rounded-full border border-white/25 bg-white/15 px-8 py-[15px] backdrop-blur-[18px] xl:px-9 xl:py-4"
              }`}
            >
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={pathname === "/" ? link.href : `/${link.href}`}
                  onClick={(event) => handleNavClick(event, link.href)}
                  className={`text-body whitespace-nowrap font-medium transition-opacity hover:opacity-80 ${
                    isSolid ? "text-[color:var(--color-black)]" : "text-white"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleContactClick}
              className={`hidden sm:inline-flex ${
                isSolid ? "btn-primary" : "btn-secondary"
              }`}
            >
              Зв&apos;язатись з нами
            </button>

            <button
              type="button"
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors lg:hidden ${
                isSolid
                  ? "bg-[color:var(--color-surface-muted)] text-[color:var(--color-black)]"
                  : "bg-white/15 text-white backdrop-blur-md"
              }`}
              aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
            </div>
          </div>
        </div>
      </header>

      <div
        data-open={menuOpen}
        className={`mobile-menu fixed inset-0 z-[60] flex flex-col bg-white transition-all duration-300 ease-out lg:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="container-px mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 py-5">
          <Link href="/" onClick={closeMenu}>
            <Image
              src="/VCRUISE-brand.svg"
              alt="VCRUISE"
              width={104}
              height={15}
              className="h-[18px] w-auto"
            />
          </Link>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-black)]"
            aria-label="Закрити меню"
            onClick={closeMenu}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <nav className="container-px mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center pb-8">
          {navLinks.map((link, index) => (
            <a
              key={link.label}
              href={pathname === "/" ? link.href : `/${link.href}`}
              onClick={(event) => handleNavClick(event, link.href)}
              className="menu-link border-b border-[color:var(--color-line)] py-5 text-h4 font-semibold text-[color:var(--color-black)] transition-colors hover:text-[color:var(--color-brand)]"
              style={{ transitionDelay: menuOpen ? `${index * 50}ms` : "0ms" }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="container-px mx-auto w-full max-w-[1400px] pb-10">
          <button
            type="button"
            className="btn-primary btn-primary--block"
            onClick={handleContactClick}
          >
            Зв&apos;язатись з нами
          </button>
        </div>
      </div>
    </>
  );
}
