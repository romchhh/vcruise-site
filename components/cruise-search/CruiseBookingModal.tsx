"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import {
  CABIN_ORDER,
  CURRENCY_SYMBOL,
} from "@/lib/cruise-search/constants";
import {
  formatDate,
  formatMoney,
  getUpcomingDates,
} from "@/lib/cruise-search/utils";
import type {
  CabinPriceMap,
  CruiseRecord,
  CurrencyCode,
} from "@/lib/cruise-search/types";
import {
  formatUaPhoneInput,
  isValidUaPhone,
} from "@/lib/contact/phone";

type GuestCounts = {
  adults: number;
  children: number;
  infants: number;
};

type CruiseBookingModalProps = {
  cruise: CruiseRecord | null;
  currency: CurrencyCode;
  /** Prefer this sailing date when opening (homepage deep-link). */
  preferredDate?: string;
  /** Prefill from hero/finder search (does not filter catalog). */
  initialGuests?: GuestCounts;
  onClose: () => void;
};

type Step = "cabins" | "form";

type FormState = {
  name: string;
  phone: string;
  details: string;
  cruiseDate: string;
  cabinType: string;
  adults: number;
  children: number;
  infants: number;
};

const initialForm: FormState = {
  name: "",
  phone: "+380 ",
  details: "",
  cruiseDate: "",
  cabinType: "",
  adults: 2,
  children: 0,
  infants: 0,
};

const GUEST_FIELDS = [
  { key: "adults" as const, label: "Дорослі", hint: "від 18 р." },
  { key: "children" as const, label: "Діти", hint: "2–17 р." },
  { key: "infants" as const, label: "Немовлята", hint: "до 2 р." },
];

const CABIN_HINTS: Record<(typeof CABIN_ORDER)[number], string> = {
  Внутрішня: "Без вікна — найдоступніший варіант",
  "З вікном": "Вікно або ілюмінатор з видом на море",
  "З балконом": "Приватний балкон і свіже повітря",
  Сьют: "Більша площа та підвищений комфорт",
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

function cabinPrice(
  cabins: CabinPriceMap | undefined,
  cabinType: string,
  currency: CurrencyCode,
) {
  const entry = cabins?.[cabinType as keyof CabinPriceMap];
  return entry?.[currency] ?? null;
}

function availableCabinsForDate(
  cabins: CabinPriceMap | undefined,
  currency: CurrencyCode,
) {
  return CABIN_ORDER.filter(
    (cabin) => cabinPrice(cabins, cabin, currency) != null,
  );
}

function GuestStepper({
  label,
  hint,
  value,
  min,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-[color:var(--color-line)] bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-caption font-semibold text-[color:var(--color-black)]">
          {label}
        </p>
        <p className="text-caption text-subtitle">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Менше: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="btn-control h-9 w-9 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-6 text-center text-body font-semibold text-[color:var(--color-black)]">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Більше: ${label}`}
          disabled={value >= 12}
          onClick={() => onChange(Math.min(12, value + 1))}
          className="btn-control h-9 w-9 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function CruiseBookingModal({
  cruise,
  currency,
  preferredDate = "",
  initialGuests,
  onClose,
}: CruiseBookingModalProps) {
  const honeypotId = useId();
  const formOpenedAtRef = useRef(0);
  const open = Boolean(cruise);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("cabins");
  const [form, setForm] = useState<FormState>(initialForm);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const upcomingDates = useMemo(
    () => (cruise ? getUpcomingDates(cruise) : []),
    [cruise],
  );

  const routeLabel = useMemo(() => {
    if (!cruise?.route?.length) return "—";
    const preview = cruise.route.slice(0, 3).join(" · ");
    const extra = cruise.route.length > 3 ? ` +${cruise.route.length - 3}` : "";
    return `${preview}${extra}`;
  }, [cruise]);

  const selectedDateEntry = useMemo(
    () => upcomingDates.find((item) => item.date === form.cruiseDate),
    [form.cruiseDate, upcomingDates],
  );

  const cabinOptions = useMemo(() => {
    const fromDate = availableCabinsForDate(
      selectedDateEntry?.cabins,
      currency,
    );
    if (fromDate.length) return fromDate;
    return availableCabinsForDate(cruise?.from_price, currency);
  }, [cruise?.from_price, currency, selectedDateEntry?.cabins]);

  const selectedCabinPrice = useMemo(() => {
    if (!form.cabinType) return null;
    return (
      cabinPrice(selectedDateEntry?.cabins, form.cabinType, currency) ??
      cabinPrice(cruise?.from_price, form.cabinType, currency)
    );
  }, [
    cruise?.from_price,
    currency,
    form.cabinType,
    selectedDateEntry?.cabins,
  ]);

  const priceLabel = useMemo(() => {
    if (selectedCabinPrice == null) return "";
    return `${formatMoney(selectedCabinPrice)} ${CURRENCY_SYMBOL[currency]}`;
  }, [currency, selectedCabinPrice]);

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
    setStep("cabins");
    const preferredEntry = preferredDate
      ? upcomingDates.find((item) => item.date === preferredDate)
      : undefined;
    const initialEntry = preferredEntry ?? upcomingDates[0];
    const firstDate = initialEntry?.date ?? "";
    const firstCabins = availableCabinsForDate(
      initialEntry?.cabins ?? cruise.from_price,
      currency,
    );
    const adults =
      initialGuests?.adults && initialGuests.adults > 0
        ? initialGuests.adults
        : 2;
    setForm({
      ...initialForm,
      cruiseDate: firstDate,
      cabinType: firstCabins[0] ?? "",
      adults,
      children: initialGuests?.children ?? 0,
      infants: initialGuests?.infants ?? 0,
    });
    const openedAt = Date.now();
    formOpenedAtRef.current = openedAt;
    setStartedAt(openedAt);
  }, [
    open,
    cruise?.key,
    preferredDate,
    upcomingDates,
    currency,
    initialGuests?.adults,
    initialGuests?.children,
    initialGuests?.infants,
  ]);

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

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const phoneValid = isValidUaPhone(form.phone);
  const canContinueToForm =
    Boolean(form.cruiseDate) &&
    Boolean(form.cabinType) &&
    form.adults >= 1;
  const canSubmit =
    form.name.trim().length >= 2 &&
    phoneValid &&
    canContinueToForm &&
    !submitting;

  const handleDateChange = (date: string) => {
    const entry = upcomingDates.find((item) => item.date === date);
    const cabins = availableCabinsForDate(
      entry?.cabins ?? cruise?.from_price,
      currency,
    );
    setForm((current) => ({
      ...current,
      cruiseDate: date,
      cabinType: cabins.includes(current.cabinType as (typeof CABIN_ORDER)[number])
        ? current.cabinType
        : (cabins[0] ?? ""),
    }));
  };

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
            cabinType: form.cabinType,
            priceLabel,
            adults: form.adults,
            children: form.children,
            infants: form.infants,
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
          : "Не вдалося надіслати заявку.",
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
        className="relative z-[101] w-full max-w-[560px] overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-caption font-semibold text-[color:var(--color-brand)]">
              {step === "cabins" ? "Крок 1 з 2 · Каюта" : "Крок 2 з 2 · Заявка"}
            </p>
            <h2
              id="cruise-booking-modal-title"
              className="text-h4 mt-1 font-bold text-[color:var(--color-black)]"
            >
              {success
                ? "Заявку надіслано"
                : step === "cabins"
                  ? "Оберіть каюту"
                  : "Оформлення бронювання"}
            </h2>
          </div>
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
            {step === "form" && form.cabinType ? (
              <p className="text-caption mt-2 font-semibold text-[color:var(--color-brand)]">
                {form.cabinType}
                {priceLabel ? ` · ${priceLabel}` : ""} ·{" "}
                {formatDate(form.cruiseDate)}
                {` · ${form.adults} дор.`}
                {form.children ? `, ${form.children} дит.` : ""}
                {form.infants ? `, ${form.infants} нем.` : ""}
              </p>
            ) : null}
          </div>

          {success ? (
            <div className="py-6 text-center">
              <p className="text-body font-semibold text-[color:var(--color-black)]">
                Дякуємо! Менеджер зв&apos;яжеться з вами для підтвердження
                бронювання та уточнення деталей.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary mt-5"
              >
                Закрити
              </button>
            </div>
          ) : step === "cabins" ? (
            <div className="mt-4 space-y-4">
              <Field label="Дата відправлення *">
                <select
                  required
                  value={form.cruiseDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="field-control h-12 w-full bg-white px-4 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                >
                  {upcomingDates.map((item) => (
                    <option key={item.date} value={item.date}>
                      {formatDate(item.date)}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <p className="text-caption mb-2 text-subtitle">
                  Тип каюти *
                </p>
                {cabinOptions.length === 0 ? (
                  <p className="rounded-card bg-amber-50 px-3 py-2 text-caption text-amber-800">
                    Для цієї дати немає цін по каютах. Оберіть іншу дату або
                    залиште заявку — менеджер уточнить варіанти.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {cabinOptions.map((cabin) => {
                      const price =
                        cabinPrice(
                          selectedDateEntry?.cabins,
                          cabin,
                          currency,
                        ) ?? cabinPrice(cruise.from_price, cabin, currency);
                      const selected = form.cabinType === cabin;
                      return (
                        <button
                          key={cabin}
                          type="button"
                          onClick={() => updateField("cabinType", cabin)}
                          className={`rounded-card border px-4 py-3 text-left transition-colors ${
                            selected
                              ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-light)]"
                              : "border-[color:var(--color-line)] bg-white hover:border-[color:var(--color-brand)]/40"
                          }`}
                        >
                          <span className="text-body font-semibold text-[color:var(--color-black)]">
                            {cabin}
                          </span>
                          <span className="text-caption mt-1 block text-subtitle">
                            {CABIN_HINTS[cabin]}
                          </span>
                          <span className="text-body mt-2 block font-bold text-[color:var(--color-brand)]">
                            {price != null
                              ? `від ${formatMoney(price)} ${CURRENCY_SYMBOL[currency]}`
                              : "Ціну уточнимо"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-caption mb-2 text-subtitle">
                  Кількість туристів *
                </p>
                <p className="text-caption mb-2.5 text-subtitle">
                  Ціни в каталозі — орієнтир за каюту. Точну вартість на вашу
                  кількість гостей підтвердить менеджер.
                </p>
                <div className="space-y-2">
                  {GUEST_FIELDS.map((field) => (
                    <GuestStepper
                      key={field.key}
                      label={field.label}
                      hint={field.hint}
                      value={form[field.key]}
                      min={field.key === "adults" ? 1 : 0}
                      onChange={(next) => updateField(field.key, next)}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!canContinueToForm}
                onClick={() => setStep("form")}
                className="btn-primary btn-primary--block disabled:cursor-not-allowed disabled:opacity-60"
              >
                Далі — оформити заявку
              </button>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
              <button
                type="button"
                onClick={() => setStep("cabins")}
                className="inline-flex items-center gap-1.5 text-caption font-semibold text-[color:var(--color-brand)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Змінити каюту або дату
              </button>

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
                  onChange={(event) =>
                    updateField("details", event.target.value)
                  }
                  rows={3}
                  maxLength={1000}
                  className="field-control w-full resize-none bg-white px-4 py-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                  placeholder="Кількість гостей, паспортні питання, особливі побажання..."
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
                {submitting ? "Надсилання..." : "Надіслати заявку на бронювання"}
              </button>

              <p className="text-caption text-center text-subtitle">
                Це заявка, не онлайн-оплата. Менеджер підтвердить наявність і
                умови.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
