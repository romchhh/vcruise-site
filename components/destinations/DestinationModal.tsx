"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { buildSearchParams } from "@/lib/cruise-search/params";
import type { Destination } from "@/types";

type DestinationModalProps = {
  destination: Destination | null;
  onClose: () => void;
};

export default function DestinationModal({
  destination,
  onClose,
}: DestinationModalProps) {
  const [mounted, setMounted] = useState(false);
  const open = Boolean(destination);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !destination) return null;

  const searchHref = `/search?${buildSearchParams({
    regions: [destination.searchLabel],
  })}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="destination-modal-title"
        className="relative z-[101] flex max-h-[94vh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--color-surface-muted)] text-[color:var(--color-black)] sm:right-5 sm:top-5"
          aria-label="Закрити вікно"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 lg:p-8">
            <div>
              <h2
                id="destination-modal-title"
                className="text-h3 pr-12 font-bold text-[color:var(--color-black)]"
              >
                {destination.title}
              </h2>
              <p className="text-body mt-2 text-subtitle">{destination.subtitle}</p>

              <div className="relative mt-5 aspect-[16/10] overflow-hidden rounded-card-inner">
                <Image
                  src={destination.image}
                  alt={destination.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 520px"
                  priority
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {destination.gallery.map((image, index) => (
                  <div
                    key={image}
                    className="relative aspect-[4/3] overflow-hidden rounded-card-inner"
                  >
                    <Image
                      src={image}
                      alt={`${destination.title} — фото ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 30vw, 160px"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <div>
                <h3 className="text-h4 font-bold text-[color:var(--color-black)]">
                  Про напрямок
                </h3>
                <div className="text-body mt-4 space-y-3 text-subtitle">
                  {destination.about.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <div className="divider my-6" />

              <div>
                <h3 className="text-h4 font-bold text-[#1B2938]">
                  Коли їхати
                </h3>

                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-surface-muted)]">
                      <Image
                        src="/icons/destinations/calendar.svg"
                        alt=""
                        width={18}
                        height={18}
                        aria-hidden
                      />
                    </span>
                    <div>
                      <p className="text-caption text-subtitle">Сезонність</p>
                      <p className="text-body mt-0.5 font-semibold text-[color:var(--color-black)]">
                        {destination.seasonality}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-surface-muted)]">
                      <Image
                        src="/icons/destinations/sun.svg"
                        alt=""
                        width={18}
                        height={18}
                        aria-hidden
                      />
                    </span>
                    <div>
                      <p className="text-caption text-subtitle">Температура</p>
                      <p className="text-body mt-0.5 font-semibold text-[color:var(--color-black)]">
                        {destination.temperature}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href={searchHref}
                onClick={onClose}
                className="btn-primary btn-primary--block mt-8"
              >
                Переглянути круїзи в цьому напрямку
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
