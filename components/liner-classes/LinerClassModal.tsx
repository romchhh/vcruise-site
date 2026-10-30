"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { buildSearchParams } from "@/lib/cruise-search/params";
import type { LinerClass } from "@/types";

type LinerClassModalProps = {
  linerClass: LinerClass | null;
  onClose: () => void;
};

function buildClassSearchHref(linerClass: LinerClass) {
  const firstWithSlug = linerClass.ships.find((ship) => ship.linerSlug);
  if (!firstWithSlug?.linerSlug) return "/search";

  const query = buildSearchParams({
    company: firstWithSlug.company ?? "",
    liner: firstWithSlug.linerSlug,
    newLinersOnly: false,
  });

  return `/search?${query}`;
}

function slugifyLinerName(name: string) {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolvePopularLiner(linerClass: LinerClass, linerName: string) {
  const normalized = linerName.trim().toLowerCase();
  const ship =
    linerClass.ships.find((item) => item.name === linerName) ||
    linerClass.ships.find(
      (item) => item.name.trim().toLowerCase() === normalized,
    );

  const liner = ship?.linerSlug || slugifyLinerName(linerName);
  if (!liner) return null;

  return {
    name: linerName,
    liner,
    company: ship?.company ?? "",
  };
}

function buildLinerSearchHref(linerClass: LinerClass, linerName: string) {
  const match = resolvePopularLiner(linerClass, linerName);
  if (!match) return null;

  const query = buildSearchParams({
    company: match.company,
    liner: match.liner,
    newLinersOnly: false,
  });
  return `/search?${query}`;
}

export default function LinerClassModal({
  linerClass,
  onClose,
}: LinerClassModalProps) {
  const [mounted, setMounted] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const open = Boolean(linerClass);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPhotoIndex(0);
  }, [linerClass?.id, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setPhotoIndex((index) =>
          linerClass
            ? (index - 1 + linerClass.gallery.length) % linerClass.gallery.length
            : index
        );
      }
      if (event.key === "ArrowRight") {
        setPhotoIndex((index) =>
          linerClass ? (index + 1) % linerClass.gallery.length : index
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, linerClass]);

  if (!mounted || !linerClass) return null;

  const photos = linerClass.gallery;
  const activePhoto = photos[photoIndex] ?? photos[0];
  const searchHref = buildClassSearchHref(linerClass);
  const logoCount = linerClass.logos.length;

  const goPrev = () => {
    setPhotoIndex((index) => (index - 1 + photos.length) % photos.length);
  };

  const goNext = () => {
    setPhotoIndex((index) => (index + 1) % photos.length);
  };

  const logoGridClass =
    logoCount >= 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : "grid-cols-2 lg:grid-cols-4";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5 lg:p-8">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="liner-class-modal-title"
        className="relative z-[101] flex max-h-[94vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card lg:max-h-[calc(100vh-4rem)]"
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
          <div className="border-b border-[color:var(--color-divider)] px-5 pb-4 pt-5 sm:px-8 sm:pb-5 sm:pt-6 lg:px-10">
            <h2
              id="liner-class-modal-title"
              className="text-h4 pr-12 font-bold text-[color:var(--color-black)]"
            >
              {linerClass.title}
            </h2>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-12 lg:items-start">
              <div
                className="relative aspect-[16/10] w-full min-w-0 overflow-hidden rounded-card-inner liner-class-media-frame liner-class-modal-photo sm:aspect-[3/2]"
              >
                {activePhoto ? (
                  <Image
                    key={activePhoto}
                    src={activePhoto}
                    alt={`${linerClass.title} — фото ${photoIndex + 1}`}
                    fill
                    className="liner-class-media-img"
                    sizes="(max-width: 1024px) 100vw, 620px"
                    priority
                  />
                ) : null}

                {photos.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="liner-class-modal-nav-btn"
                      aria-label="Попереднє фото"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="liner-class-modal-nav-btn"
                      aria-label="Наступне фото"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col overflow-visible">
                <h3 className="text-h4 font-bold leading-snug text-[color:var(--color-black)] break-words">
                  {linerClass.modalHeadline}
                </h3>

                <div className="text-body mt-4 space-y-3 break-words text-subtitle [overflow-wrap:anywhere]">
                  {linerClass.modalDescription.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <div className="divider my-6" />

                <div>
                  <h4 className="text-body font-semibold text-[color:var(--color-black)]">
                    Найпопулярніші лайнери
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {linerClass.popularLiners.map((liner) => {
                      const href = buildLinerSearchHref(linerClass, liner);
                      if (!href) {
                        return (
                          <span
                            key={liner}
                            className="liner-class-modal-chip max-w-full whitespace-normal text-center"
                          >
                            {liner}
                          </span>
                        );
                      }

                      return (
                        <Link
                          key={liner}
                          href={href}
                          onClick={onClose}
                          className="liner-class-modal-chip liner-class-modal-chip--link max-w-full whitespace-normal text-center"
                        >
                          {liner}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="divider my-6" />

                <Link
                  href={searchHref}
                  onClick={onClose}
                  className="btn-primary btn-primary--block"
                >
                  Підібрати круїз
                </Link>
              </div>
            </div>

            {logoCount > 0 ? (
              <div className={`mt-6 grid gap-3 ${logoGridClass}`}>
                {linerClass.logos.map((logo) => (
                  <div key={logo.src} className="liner-class-modal-logo-cell">
                    <div className="relative mx-auto h-12 w-full max-w-[140px]">
                      <Image
                        src={logo.src}
                        alt={logo.alt}
                        fill
                        className="liner-class-media-img"
                        sizes="140px"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
