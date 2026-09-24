"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/cruise-search/constants";
import {
  cheapestPrice,
  formatDate,
  formatMoney,
  getUpcomingDates,
} from "@/lib/cruise-search/utils";
import type { CruiseRecord, CurrencyCode } from "@/lib/cruise-search/types";
import {
  formatUaPhoneInput,
  isValidUaPhone,
} from "@/lib/contact/phone";

type CruiseBookingModalProps = {
  cruise: CruiseRecord | null;
  currency: CurrencyCode;
  onClose: () => void;
};

type FormState = {
  name: string;
  phone: string;
  details: string;
  cruiseDate: string;
};

const initialForm: FormState = {
  name: "",
  phone: "+380 ",
  details: "",
  cruiseDate: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-caption mb-1.5 block text-subtitle">{label}</span>
      {children}
    </label>
  );
}

export default function CruiseBookingModal({
  cruise,
  currency,
  onClose,
}: CruiseBookingModalProps) {
  const honeypotId = useId();
  const formOpenedAtRef = useRef(0);
  const open = Boolean(cruise);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const upcomingDates = useMemo(
    () => (cruise ? getUpcomingDates(cruise) : []),
    [cruise]
  );

  const routeLabel = useMemo(() => {
    if (!cruise?.route?.length) return "—";
    const preview = cruise.route.slice(0, 3).join(" · ");
    const extra = cruise.route.length > 3 ? ` +${cruise.route.length - 3}` : "";
    return `${preview}${extra}`;
  }, [cruise]);

  const selectedDateEntry = useMemo(
    () => upcomingDates.find((item) => item.date === form.cruiseDate),
    [form.cruiseDate, upcomingDates]
  );

  const priceLabel = useMemo(() => {
    if (!cruise) return "";

    const datePrice = selectedDateEntry
      ? Object.values(selectedDateEntry.cabins ?? {})
          .map((prices) => prices?.[currency])
          .filter((value): value is number => value != null)
          .sort((left, right) => left - right)[0]
      : null;

    const price = datePrice ?? cheapestPrice(cruise, currency);
    if (price == null) return "";

    return `${formatMoney(price)} ${CURRENCY_SYMBOL[currency]}`;
  }, [cruise, currency, selectedDateEntry]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !cruise) {
      setStartedAt(null);
      return;
    }

    setError("");
    setSuccess(false);
    setForm({
      ...initialForm,
      cruiseDate: upcomingDates[0]?.date ?? "",
    });
    const openedAt = Date.now();
    formOpenedAtRef.current = openedAt;
    setStartedAt(openedAt);
  }, [open, cruise?.key, upcomingDates[0]?.date]);

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

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const phoneValid = isValidUaPhone(form.phone);
  const canSubmit =
    form.name.trim().length >= 2 &&
    phoneValid &&
    Boolean(form.cruiseDate) &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !startedAt || !cruise) return;

    setSubmitting(true);
    setError("");

    const honeypot =
      (document.getElementById(honeypotId) as HTMLInputElement | null)?.value ??
      "";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          details: form.details.trim(),
          booking: {
            linerName: cruise.liner_name || cruise.cruise_title,
            company: cruise.cruise_title,
            region: cruise.region_name || cruise.region_id,
            route: routeLabel,
            nights: cruise.nights || 1,
            cruiseDate: form.cruiseDate,
            priceLabel,
          },
          _hp: honeypot,
          startedAt: formOpenedAtRef.current || startedAt || Date.now(),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Не вдалося надіслати заявку.");
      }

      setSuccess(true);
      setForm(initialForm);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не вдалося надіслати заявку."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open || !cruise) return null;

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
        aria-labelledby="cruise-booking-modal-title"
        className="relative z-[101] w-full max-w-[480px] overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
          <h2
            id="cruise-booking-modal-title"
            className="text-h4 font-bold text-[color:var(--color-black)]"
          >
            Забронювати круїз
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-control flex-shrink-0"
            aria-label="Закрити вікно"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="rounded-card bg-[color:var(--color-surface-muted)] px-4 py-3">
            <p className="text-body font-semibold text-[color:var(--color-black)]">
              {cruise.liner_name}
            </p>
            <p className="text-caption mt-1 text-subtitle">
              {cruise.cruise_title} · {cruise.region_name}
            </p>
            <p className="text-caption mt-2 text-subtitle">
              {routeLabel} · {cruise.nights_str ?? `${cruise.nights} ночей`}
            </p>
          </div>

          {success ? (
            <div className="py-6 text-center">
              <p className="text-body font-semibold text-[color:var(--color-black)]">
                Дякуємо! Менеджер зв&apos;яжеться з вами для підтвердження
                бронювання.
              </p>
              <button type="button" onClick={onClose} className="btn-primary mt-5">
                Закрити
              </button>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
              <Field label="Дата відправлення *">
                <select
                  required
                  value={form.cruiseDate}
                  onChange={(event) =>
                    updateField("cruiseDate", event.target.value)
                  }
                  className="field-control h-12 w-full bg-white px-4 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                >
                  {upcomingDates.map((item) => {
                    const datePrice = Object.values(item.cabins ?? {})
                      .map((prices) => prices?.[currency])
                      .filter((value): value is number => value != null)
                      .sort((left, right) => left - right)[0];

                    const optionLabel = datePrice
                      ? `${formatDate(item.date)} · від ${formatMoney(datePrice)} ${CURRENCY_SYMBOL[currency]}`
                      : formatDate(item.date);

                    return (
                      <option key={item.date} value={item.date}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>
              </Field>

              <Field label="Ім'я *">
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="field-control h-12 w-full bg-white px-4 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                  placeholder="Ваше ім'я"
                  maxLength={80}
                />
              </Field>

              <Field label="Телефон *">
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField("phone", formatUaPhoneInput(event.target.value))
                  }
                  onFocus={(event) => {
                    if (!event.target.value.trim()) {
                      updateField("phone", "+380 ");
                    }
                  }}
                  className="field-control h-12 w-full bg-white px-4 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                  placeholder="+380 (XX) XXX-XX-XX"
                />
              </Field>

              <Field label="Коментар">
                <textarea
                  value={form.details}
                  onChange={(event) => updateField("details", event.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="field-control w-full resize-none bg-white px-4 py-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                  placeholder="Каюта, кількість людей, особливі побажання..."
                />
              </Field>

              <input
                id={honeypotId}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                data-1p-ignore
                data-lpignore="true"
                className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              {error ? (
                <p className="rounded-card bg-red-50 px-3 py-2 text-caption text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary btn-primary--block disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Надсилання..." : "Надіслати заявку"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
