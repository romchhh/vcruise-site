"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useContactModal } from "@/components/contact/ContactModalProvider";
import type { PackageTour } from "@/types";

const stayIcons = [
  { icon: "/icons/package-tours/room.svg", label: "Номер", key: "room" as const },
  {
    icon: "/icons/package-tours/guests.svg",
    label: "Гості",
    key: "guests" as const,
  },
  {
    icon: "/icons/package-tours/meals.svg",
    label: "Харчування",
    key: "meals" as const,
  },
  { icon: "/icons/package-tours/bed.svg", label: "Ліжко", key: "bed" as const },
];

type PackageTourModalProps = {
  tour: PackageTour | null;
  onClose: () => void;
};

export default function PackageTourModal({
  tour,
  onClose,
}: PackageTourModalProps) {
  const { openContactModal } = useContactModal();
  const [mounted, setMounted] = useState(false);
  const open = Boolean(tour);

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

  if (!mounted || !tour) return null;

  const [heroImage, sideImage, ...thumbnails] = tour.gallery;
  const pricePerPerson = Math.round(tour.price / 2);

  const handleQuote = () => {
    onClose();
    openContactModal();
  };

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
        aria-labelledby="package-tour-modal-title"
        className="relative z-[101] flex max-h-[94vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card lg:max-h-[calc(100vh-2rem)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--color-surface-muted)] text-[color:var(--color-black)] sm:right-5 sm:top-5"
          aria-label="Закрити вікно"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="max-lg:overflow-y-auto lg:overflow-hidden">
          <div className="border-b border-[color:var(--color-divider)] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <h2
              id="package-tour-modal-title"
              className="text-h4 pr-12 font-bold text-[color:var(--color-black)]"
            >
              {tour.hotel}{" "}
              <span className="text-[color:var(--color-black)]">
                {"★".repeat(tour.rating)}
              </span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-subtitle">
              <span>{tour.city}</span>
              <span className="inline-flex items-center gap-2">
                <span className="rounded-[6px] bg-[color:var(--color-brand)] px-2 py-0.5 text-caption font-semibold text-white">
                  {tour.reviewScore}
                </span>
                <span>
                  {tour.reviewLabel} · {tour.reviewCount.toLocaleString("uk-UA")}{" "}
                  відгуків
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8 lg:p-7">
            <div>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="relative col-span-2 aspect-[5/4] overflow-hidden rounded-card-inner">
                  <Image
                    src={heroImage}
                    alt={tour.hotel}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 320px"
                    priority
                  />
                </div>
                <div className="relative col-span-2 aspect-[5/4] overflow-hidden rounded-card-inner">
                  <Image
                    src={sideImage}
                    alt={`${tour.hotel} — інтер'єр`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 320px"
                  />
                </div>
                {thumbnails.map((image, index) => (
                  <div
                    key={image}
                    className="relative col-span-1 aspect-square overflow-hidden rounded-card-inner"
                  >
                    <Image
                      src={image}
                      alt={`${tour.hotel} — фото ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 22vw, 140px"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <h3 className="text-h4 font-bold text-[color:var(--color-black)]">
                  Ваше проживання
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {stayIcons.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-card bg-[color:var(--color-surface-muted)] px-3 py-3.5"
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden
                        className="mb-2.5"
                      />
                      <p className="text-caption text-subtitle">{item.label}</p>
                      <p className="text-caption mt-1 font-semibold text-[color:var(--color-black)]">
                        {tour[item.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:min-h-0">
              <div>
                <h3 className="text-h4 font-bold text-[color:var(--color-black)]">
                  Про готель
                </h3>
                <p className="text-body mt-3 text-subtitle">{tour.about}</p>
              </div>

              <div className="mt-5">
                <h3 className="text-h4 font-bold text-[color:var(--color-black)]">
                  Зручності
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tour.amenities.map((amenity) => (
                    <span key={amenity} className="chip chip-muted">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-h4 font-bold text-[color:var(--color-black)]">
                  У вартість входить
                </h3>
                <ul className="mt-3 space-y-2">
                  {tour.included.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-body text-subtitle"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--color-brand)]"
                        strokeWidth={2.5}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="divider mt-5 pt-5 lg:mt-auto">
                <p className="text-caption text-subtitle">Пакет для 2 дорослих</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-h3 font-bold text-[color:var(--color-black)]">
                    ${tour.price.toLocaleString("en-US")}
                  </span>
                  <span className="text-caption text-subtitle">
                    ${pricePerPerson.toLocaleString("en-US")} / особа
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuote}
                className="btn-primary btn-primary--block mt-5"
              >
                Запросити прорахунок
              </button>
              <p className="text-caption mt-3 text-center text-subtitle">
                Фінальна вартість може змінюватися залежно від дат та доступності
                номерів.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
