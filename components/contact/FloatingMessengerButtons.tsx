"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BrandMessengerIcon from "@/components/icons/BrandMessengerIcon";
import { messengerBrandHex } from "@/lib/messenger-brands";
import { getMessengerLinks, type MessengerLink } from "@/lib/messengers";

const SCROLL_SHOW_PX = 200;

export default function FloatingMessengerButtons({
  links: linksProp,
}: {
  links?: MessengerLink[];
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const links = linksProp?.length ? linksProp : getMessengerLinks();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (links.length === 0) return;

    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_SHOW_PX);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [links.length]);

  if (links.length === 0) return null;

  // Outer-right column, same baseline as the chat launcher (chat sits to the left).
  const positionClass = isHome
    ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 sm:bottom-[calc(7.25rem+env(safe-area-inset-bottom))] sm:right-6"
    : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6";

  return (
    <div
      className={`fixed z-[79] flex flex-col gap-3 transition-all duration-300 ease-out ${positionClass} ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
          aria-label={link.label}
          title={link.label}
          className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: messengerBrandHex(link.id) }}
        >
          <BrandMessengerIcon brand={link.id} size={26} color="current" />
        </a>
      ))}
    </div>
  );
}
