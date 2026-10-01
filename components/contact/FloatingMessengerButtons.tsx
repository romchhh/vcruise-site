"use client";

import { useEffect, useState } from "react";
import BrandMessengerIcon from "@/components/icons/BrandMessengerIcon";
import { messengerBrandHex } from "@/lib/messenger-brands";
import { getMessengerLinks } from "@/lib/messengers";

const SCROLL_SHOW_PX = 200;

export default function FloatingMessengerButtons() {
  const links = getMessengerLinks();
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

  return (
    <div
      className={`fixed bottom-5 right-4 z-40 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)] transition-all duration-300 ease-out sm:bottom-6 sm:right-6 ${
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
