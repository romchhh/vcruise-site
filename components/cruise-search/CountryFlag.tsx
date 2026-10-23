"use client";

import { useLayoutEffect, useRef } from "react";
import "country-flag-icons/3x2/flags.css";

/**
 * SVG flag via country-flag-icons CSS (not Unicode emoji).
 * Class names like `flag:IT` are set on the DOM so Tailwind does not parse them.
 */
export default function CountryFlag({ code }: { code: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.className = `flag:${code}`;
    node.style.setProperty("--CountryFlagIcon-height", "0.875rem");
    node.style.borderRadius = "2px";
    node.style.boxShadow = "0 0 0 1px rgba(15, 23, 42, 0.14)";
    node.style.flexShrink = "0";
  }, [code]);

  return <span ref={ref} aria-hidden />;
}
