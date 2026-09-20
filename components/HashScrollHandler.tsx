"use client";

import { useEffect } from "react";
import {
  consumePendingScrollSection,
  scrollToSection,
} from "@/lib/scroll-to-section";

export default function HashScrollHandler() {
  useEffect(() => {
    const pendingHash = consumePendingScrollSection();
    const hash = pendingHash ?? window.location.hash;

    if (!hash) return;

    const frame = window.requestAnimationFrame(() => {
      scrollToSection(hash);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return null;
}
