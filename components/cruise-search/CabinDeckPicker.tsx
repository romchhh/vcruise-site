"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { isValidPromoid } from "@/lib/cruise-search/promoid";
import type { CabinAvailability } from "@/lib/cruise-search/cabin-availability";
import type { CruiseCabinOffer } from "@/lib/cruise-search/types";
import CruiseInlineLoader from "./CruiseInlineLoader";

type Props = {
  bookingUrl: string;
  offer: CruiseCabinOffer;
  adults: number;
  children: number;
  teens: number;
  onConfirm: (cabinNumber: string) => void;
};

const availabilityCache = new Map<
  string,
  { at: number; data: CabinAvailability }
>();
const AVAILABILITY_TTL_MS = 3 * 60 * 1000;

function availabilityKey(parts: {
  bookingUrl: string;
  cabinCode: string;
  promoid: string;
  adults: number;
  children: number;
  teens: number;
}) {
  return [
    parts.bookingUrl,
    parts.cabinCode,
    parts.promoid,
    parts.adults,
    parts.children,
    parts.teens,
  ].join("|");
}

export default function CabinDeckPicker({
  bookingUrl,
  offer,
  adults,
  children,
  teens,
  onConfirm,
}: Props) {
  const [data, setData] = useState<CabinAvailability | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState("");
  const [cabinNumber, setCabinNumber] = useState("");
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    if (!planOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlanOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [planOpen]);

  useEffect(() => {
    if (!isValidPromoid(offer.promoid) || !bookingUrl) {
      setLoading(false);
      setError("Номери кают для цього тарифу уточнює менеджер.");
      setData(null);
      return;
    }

    const controller = new AbortController();
    const cacheId = availabilityKey({
      bookingUrl,
      cabinCode: offer.cabinCode,
      promoid: offer.promoid,
      adults,
      children,
      teens,
    });
    const cached = availabilityCache.get(cacheId);
    if (cached && Date.now() - cached.at < AVAILABILITY_TTL_MS) {
      setData(cached.data);
      const first = cached.data.decks[0];
      setDeck(first?.number ?? "");
      setCabinNumber(first?.cabins[0] ?? "");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    const params = new URLSearchParams({
      bookingUrl,
      cabinCode: offer.cabinCode,
      promoid: offer.promoid,
      adults: String(adults),
      children: String(children),
      teens: String(teens),
    });

    void fetch(`/api/cruise-cabin-availability?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as CabinAvailability & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Не вдалося завантажити план палуби.");
        }
        return payload;
      })
      .then((payload) => {
        availabilityCache.set(cacheId, { at: Date.now(), data: payload });
        setData(payload);
        const first = payload.decks[0];
        setDeck(first?.number ?? "");
        setCabinNumber(first?.cabins[0] ?? "");
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Не вдалося завантажити план палуби.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [adults, bookingUrl, children, offer.cabinCode, offer.promoid, teens]);

  const activeDeck = useMemo(
    () => data?.decks.find((item) => item.number === deck) ?? data?.decks[0],
    [data, deck],
  );

  if (loading) {
    return (
      <CruiseInlineLoader
        label="Завантажуємо номери кают і план палуби…"
        variant="block"
        className="min-h-56 bg-[color:var(--color-surface-muted)]"
      />
    );
  }

  if (error) {
    return (
      <div className="px-4 py-4">
        <p className="text-caption text-amber-800">{error}</p>
        <button
          type="button"
          onClick={() => onConfirm("MANAGER")}
          className="mt-3 text-caption font-semibold text-[color:var(--color-brand)]"
        >
          Продовжити без номера каюти
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (data.managerOnly) {
    return (
      <div className="px-4 py-4">
        <p className="text-caption text-[color:var(--color-black)]">
          {data.managerMessage}
        </p>
        <button
          type="button"
          onClick={() => onConfirm("MANAGER")}
          className="btn-primary mt-4"
        >
          Залишити заявку
        </button>
      </div>
    );
  }

  const plan = activeDeck?.imageUrl ?? "";

  const planDialog =
    planOpen && plan
      ? createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-3 sm:p-6">
            <button
              type="button"
              aria-label="Закрити план палуби"
              className="absolute inset-0"
              onClick={() => setPlanOpen(false)}
            />
            <div className="relative z-[131] flex h-[96vh] w-full max-w-[960px] flex-col overflow-hidden rounded-card bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-line)] px-4 py-3">
                <p className="text-caption font-semibold text-[color:var(--color-black)]">
                  План палуби {activeDeck?.number}
                </p>
                <button
                  type="button"
                  onClick={() => setPlanOpen(false)}
                  className="btn-control"
                  aria-label="Закрити"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-[color:var(--color-surface-muted)] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan}
                  alt={`План палуби ${activeDeck?.number ?? ""}`}
                  className="mx-auto block h-auto w-auto max-w-full"
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="bg-white px-3 py-4 sm:px-4">
      <div className="min-w-0">
        {data.decks.length > 0 ? (
          <div>
            <p className="text-caption mb-2.5 font-semibold text-[color:var(--color-black)]">
              Палуба
            </p>
            <div className="flex flex-wrap gap-2.5">
              {data.decks.map((item) => {
                const active = item.number === (activeDeck?.number ?? "");
                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => {
                      setDeck(item.number);
                      setCabinNumber(item.cabins[0] ?? "");
                    }}
                    className={`flex min-h-[3rem] min-w-[3rem] items-center justify-center rounded-card-inner border px-3.5 py-2 text-body font-bold tabular-nums transition-colors ${
                      active
                        ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white"
                        : "border-[color:var(--color-line)] bg-white text-[color:var(--color-black)] hover:border-[color:var(--color-brand)]/40"
                    }`}
                  >
                    {item.number}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="relative mt-4">
          <div className="max-h-[70vh] overflow-auto rounded-card bg-[color:var(--color-surface-muted)]">
            {plan ? (
              <button
                type="button"
                onClick={() => setPlanOpen(true)}
                className="block w-full cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan}
                  alt={`План палуби ${activeDeck?.number ?? ""}`}
                  className="mx-auto block h-auto w-auto max-w-full"
                />
              </button>
            ) : (
              <p className="px-3 py-6 text-center text-caption text-subtitle">
                Для цього тарифу план палуби не публікується.
              </p>
            )}
          </div>
          {plan ? (
            <span className="chip chip-brand pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
              Натисніть, щоб збільшити
            </span>
          ) : null}
        </div>

        {activeDeck?.cabins.length ? (
          <div className="mt-4">
            <p className="text-caption mb-2 font-semibold text-[color:var(--color-black)]">
              Номер каюти
            </p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {activeDeck.cabins.map((number) => {
                const selected = cabinNumber === number;
                return (
                  <label
                    key={number}
                    className={`relative flex min-h-[3rem] cursor-pointer items-center justify-center rounded-card-inner border px-2 py-2.5 text-body font-bold tracking-tight transition-colors ${
                      selected
                        ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white"
                        : "border-[color:var(--color-line)] bg-white text-[color:var(--color-black)] hover:border-[color:var(--color-brand)]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`cabin-${offer.cabinCode}-${offer.promoid}`}
                      value={number}
                      checked={selected}
                      onChange={() => setCabinNumber(number)}
                      className="sr-only"
                    />
                    {number}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {data.guaranteeNote ? (
          <p className="mt-3 text-caption text-subtitle">{data.guaranteeNote}</p>
        ) : null}

        <button
          type="button"
          disabled={!cabinNumber}
          onClick={() => onConfirm(cabinNumber)}
          className="btn-primary btn-primary--block mt-5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Вибрати номер каюти
        </button>

        {data.legend.length ? (
          <div className="mt-4">
            <p className="text-caption font-semibold text-[color:var(--color-black)]">
              Особливі позначки:
            </p>
            <ul className="mt-2 space-y-1.5">
              {data.legend.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                  <span className="text-caption text-subtitle">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {planDialog}
    </div>
  );
}
