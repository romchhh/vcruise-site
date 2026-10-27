"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CRUISE_LOADING_TIPS } from "@/lib/cruise-search/cruise-loading-tips";

type CruisePagePreloaderProps = {
  label?: string;
  className?: string;
  showTips?: boolean;
};

export default function CruisePagePreloader({
  label = "Завантаження…",
  className = "",
  showTips = true,
}: CruisePagePreloaderProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!showTips) return;
    const id = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % CRUISE_LOADING_TIPS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [showTips]);

  return (
    <div
      className={`relative overflow-hidden rounded-card border border-[color:var(--color-line)] bg-gradient-to-b from-white to-[color:var(--color-surface-muted)] px-6 py-10 sm:px-10 sm:py-14 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-40"
        aria-hidden
      >
        <div className="cruise-loader-wave absolute bottom-0 left-[-20%] h-full w-[140%]" />
        <div className="cruise-loader-wave cruise-loader-wave--delay absolute bottom-2 left-[-15%] h-[85%] w-[130%] opacity-70" />
      </div>

      <div className="relative flex flex-col items-center justify-center gap-5 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-brand)]/15"
            aria-hidden
          />
          <div
            className="absolute inset-2 animate-spin rounded-full border-[3px] border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
            aria-hidden
          />
          <Image
            src="/VCRUISE-brand.svg"
            alt=""
            width={44}
            height={44}
            className="relative z-10 h-11 w-11 object-contain"
            priority
          />
        </div>

        <div>
          <p className="text-body font-semibold text-[color:var(--color-black)]">
            {label}
          </p>
          {showTips ? (
            <p
              key={tipIndex}
              className="text-caption mt-3 max-w-md text-subtitle cruise-loader-tip"
            >
              {CRUISE_LOADING_TIPS[tipIndex]}
            </p>
          ) : null}
        </div>

        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--color-brand)]"
              style={{ animationDelay: `${dot * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
