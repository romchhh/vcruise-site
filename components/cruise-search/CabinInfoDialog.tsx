"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CabinInfo } from "@/lib/cruise-search/cabin-info";
import CruiseInlineLoader from "./CruiseInlineLoader";

type Props = {
  shipId: string;
  cabinCode: string;
  fallbackTitle: string;
  onClose: () => void;
};

function CabinInfoSections({ sections }: { sections: CabinInfo["sections"] }) {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const isBulletList =
          Boolean(section.heading) && section.lines.length > 1;
        const isParagraph =
          !section.heading && section.lines.length === 1;

        if (isParagraph) {
          return (
            <p
              key={`p-${index}`}
              className="text-body leading-relaxed text-subtitle [overflow-wrap:anywhere]"
            >
              {section.lines[0]}
            </p>
          );
        }

        if (isBulletList) {
          return (
            <div key={`list-${index}`}>
              <p className="text-body font-semibold text-[color:var(--color-black)]">
                {section.heading}
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body text-subtitle marker:text-[color:var(--color-brand)]">
                {section.lines.map((line) => (
                  <li key={line} className="leading-snug [overflow-wrap:anywhere]">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        return (
          <div key={`block-${index}`}>
            {section.heading ? (
              <p className="text-body font-semibold text-[color:var(--color-black)]">
                {section.heading}
              </p>
            ) : null}
            <div className={section.heading ? "mt-2 space-y-2" : "space-y-2"}>
              {section.lines.map((line) => (
                <p
                  key={line}
                  className="text-body leading-relaxed text-subtitle [overflow-wrap:anywhere]"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CabinInfoDialog({
  shipId,
  cabinCode,
  fallbackTitle,
  onClose,
}: Props) {
  const [info, setInfo] = useState<CabinInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setInfo(null);
    setImageIndex(0);
    const params = new URLSearchParams({ shipId, cabinCode });
    void fetch(`/api/cruise-cabin-info?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as CabinInfo & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Не вдалося завантажити опис.");
        }
        return payload;
      })
      .then(setInfo)
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Не вдалося завантажити опис.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cabinCode, shipId]);

  const image = info?.images[imageIndex];
  const imageCount = info?.images.length ?? 0;

  const goPrev = () => {
    if (!info?.images.length) return;
    setImageIndex((current) =>
      current === 0 ? info.images.length - 1 : current - 1,
    );
  };

  const goNext = () => {
    if (!info?.images.length) return;
    setImageIndex((current) => (current + 1) % info.images.length);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Закрити опис каюти"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cabin-info-title"
        className="relative z-[121] flex max-h-[calc(100vh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-h-[calc(100vh-2rem)] sm:rounded-card"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--color-line)] px-5 py-4 sm:px-6">
          <h2
            id="cabin-info-title"
            className="text-h4 min-w-0 pr-2 font-bold leading-snug text-[color:var(--color-black)]"
          >
            {info?.title || fallbackTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-control shrink-0"
            aria-label="Закрити"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {error ? (
            <p className="text-caption text-red-700">{error}</p>
          ) : loading ? (
            <CruiseInlineLoader
              label="Завантажуємо опис каюти…"
              variant="block"
            />
          ) : !info ? null : (
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-card-inner bg-[color:var(--color-surface-muted)]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={`Фото каюти ${imageIndex + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {imageCount > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="btn-control absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center p-0 shadow-sm"
                        aria-label="Попереднє фото"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="btn-control absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center p-0 shadow-sm"
                        aria-label="Наступне фото"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    </>
                  ) : null}
                </div>
                {imageCount > 1 ? (
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {info.images.map((src, index) => (
                      <button
                        key={src}
                        type="button"
                        aria-label={`Фото ${index + 1}`}
                        aria-current={index === imageIndex}
                        onClick={() => setImageIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === imageIndex
                            ? "w-6 bg-[color:var(--color-brand)]"
                            : "w-1.5 bg-[color:var(--color-line)] hover:bg-[color:var(--color-silver)]"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 rounded-card-inner bg-[color:var(--color-surface-muted)] px-3 py-2 text-caption leading-snug text-[color:var(--color-silver)]">
                  Зображення загальні та можуть відрізнятись від реальних.
                </p>
              </div>

              <div className="rounded-card bg-[color:var(--color-surface-muted)] p-4 sm:p-5">
                <p className="text-caption mb-3 font-semibold text-[color:var(--color-black)]">
                  Опис каюти
                </p>
                <CabinInfoSections sections={info.sections} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
