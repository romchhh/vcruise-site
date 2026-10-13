"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContactModal } from "@/components/contact/ContactModalProvider";
import { navLinks } from "@/lib/navigation";
import { queueScrollToSection, scrollToSection } from "@/lib/scroll-to-section";

const MENU_LINK_COUNT = navLinks.length;

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

  const headerOnLight = forceSolid || scrolled || menuOpen;
  const logoSrc = headerOnLight ? "/VCRUISE-brand.svg" : "/VCRUISE.svg";
  const logoClassName = "h-[16px] w-auto sm:h-[18px] lg:h-[20px]";

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

  const shellTransition =
    "transition-[background-color,box-shadow,border-color,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

  const shellClasses = menuOpen
    ? `max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:border-[color:var(--color-line)] max-lg:bg-white max-lg:py-3 max-lg:shadow-none lg:rounded-shell lg:border lg:border-[color:var(--color-line)] lg:bg-white lg:py-3 lg:shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${shellTransition}`
    : headerOnLight
      ? `rounded-shell border border-[color:var(--color-line)] bg-white py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${shellTransition}`
      : `bg-transparent py-5 sm:py-6 lg:py-8 ${shellTransition}`;

  const outerWrapClasses = menuOpen
    ? "px-0 pt-0 md:px-0 md:pt-0"
    : headerOnLight
      ? "px-0.5 pt-0.5 md:px-1 md:pt-1"
      : "";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 ${menuOpen ? "z-[70]" : "z-50"}`}
      >
        <div className={outerWrapClasses}>
          <div className={shellClasses}>
            <div className="container-px mx-auto flex max-w-[1400px] items-center justify-between gap-4">
              <Link
                href="/"
                className="relative z-10 flex-shrink-0"
                onClick={closeMenu}
              >
                <Image
                  src={logoSrc}
                  alt="VCRUISE"
                  width={104}
                  height={15}
                  priority
                  className={logoClassName}
                />
              </Link>

              <nav className="hidden items-center lg:flex">
                <div
                  className={`flex items-center gap-7 xl:gap-8 ${
                    headerOnLight
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
                        headerOnLight
                          ? "text-[color:var(--color-black)]"
                          : "text-white"
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
                  className={`btn-header-mobile hidden sm:inline-flex ${
                    headerOnLight ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {"Зв'язатись з нами"}
                </button>

                <button
                  type="button"
                  data-open={menuOpen}
                  className={`menu-toggle flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 sm:h-10 sm:w-10 lg:hidden ${
                    headerOnLight
                      ? "bg-[color:var(--color-surface-muted)] text-[color:var(--color-black)]"
                      : "bg-white/15 text-white backdrop-blur-md"
                  }`}
                  aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-navigation"
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  <span className="menu-toggle__icon" aria-hidden>
                    <span className="menu-toggle__bar" />
                    <span className="menu-toggle__bar" />
                    <span className="menu-toggle__bar" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        id="mobile-navigation"
        data-open={menuOpen}
        className="mobile-menu lg:hidden"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu__panel">
          <nav
            className="mobile-menu__nav container-px mx-auto w-full max-w-[1400px] pb-6"
            style={
              {
                "--menu-count": MENU_LINK_COUNT,
              } as CSSProperties
            }
          >
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={pathname === "/" ? link.href : `/${link.href}`}
                onClick={(event) => handleNavClick(event, link.href)}
                className="menu-link border-b border-[color:var(--color-line)] py-5 text-h4 font-semibold text-[color:var(--color-black)] transition-colors hover:text-[color:var(--color-brand)]"
                style={{ "--menu-i": index } as CSSProperties}
                tabIndex={menuOpen ? 0 : -1}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mobile-menu__cta container-px mx-auto w-full max-w-[1400px] pb-10">
            <button
              type="button"
              className="btn-primary btn-primary--block btn-header-mobile"
              onClick={handleContactClick}
              tabIndex={menuOpen ? 0 : -1}
            >
              {"Зв'язатись з нами"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
