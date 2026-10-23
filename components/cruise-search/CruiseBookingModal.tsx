"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import {
  CABIN_ORDER,
  CURRENCY_SYMBOL,
} from "@/lib/cruise-search/constants";
import {
  addDaysIso,
  formatDate,
  formatMoney,
  formatSailingDateRange,
  getUpcomingDates,
  scaleCabinPriceForGuests,
} from "@/lib/cruise-search/utils";
import type {
  CabinPriceMap,
  CruiseCabinOffer,
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
  preferredDate?: string;
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
  offerKey: string;
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
  offerKey: "",
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

function offerKeyOf(offer: CruiseCabinOffer) {
  return `${offer.cabinCode}::${offer.tariffName}`;
}

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

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-caption text-[color:var(--color-black)]">
      {children}
    </span>
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
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const upcomingDates = useMemo(
    () => (cruise ? getUpcomingDates(cruise) : []),
    [cruise],
  );

  const routeFull = useMemo(() => {
    if (!cruise?.route?.length) return "—";
    return cruise.route.join(" · ");
  }, [cruise]);

  const selectedDateEntry = useMemo(
    () => upcomingDates.find((item) => item.date === form.cruiseDate),
    [form.cruiseDate, upcomingDates],
  );

  const sailingLabel = useMemo(() => {
    if (!form.cruiseDate || !cruise) return "";
    return formatSailingDateRange(form.cruiseDate, cruise.nights || 1);
  }, [cruise, form.cruiseDate]);

  const cruiseDateEnd = useMemo(() => {
    if (!form.cruiseDate || !cruise) return "";
    return addDaysIso(form.cruiseDate, Math.max(cruise.nights || 1, 1));
  }, [cruise, form.cruiseDate]);

  const bookingUrl = selectedDateEntry?.booking_url?.trim() || "";

  const offers = useMemo(
    () => selectedDateEntry?.offers ?? [],
    [selectedDateEntry?.offers],
  );
  const hasOffers = offers.length > 0;

  const cabinOptions = useMemo(() => {
    if (hasOffers) {
      const fromOffers = CABIN_ORDER.filter((cat) =>
        offers.some(
          (offer) =>
            offer.cabinCategory === cat &&
            offer.price?.[currency] != null,
        ),
      );
      if (fromOffers.length) return fromOffers;
    }
    const fromDate = availableCabinsForDate(
      selectedDateEntry?.cabins,
      currency,
    );
    if (fromDate.length) return fromDate;
    return availableCabinsForDate(cruise?.from_price, currency);
  }, [
    cruise?.from_price,
    currency,
    hasOffers,
    offers,
    selectedDateEntry?.cabins,
  ]);

  const filteredOffers = useMemo(() => {
    const cat = categoryFilter || form.cabinType;
    if (!cat) return offers;
    return offers.filter((offer) => offer.cabinCategory === cat);
  }, [offers, categoryFilter, form.cabinType]);

  const selectedOffer = useMemo(
    () => offers.find((offer) => offerKeyOf(offer) === form.offerKey) ?? null,
    [offers, form.offerKey],
  );

  const scalePrice = (base: number | null) => {
    if (base == null) return null;
    return scaleCabinPriceForGuests(
      base,
      form.adults,
      form.children,
      form.infants,
    );
  };

  const selectedCabinPrice = useMemo(() => {
    if (selectedOffer?.price?.[currency] != null) {
      return scalePrice(selectedOffer.price[currency]!);
    }
    if (!form.cabinType) return null;
    const base =
      cabinPrice(selectedDateEntry?.cabins, form.cabinType, currency) ??
      cabinPrice(cruise?.from_price, form.cabinType, currency);
    return scalePrice(base);
  }, [
    cruise?.from_price,
    currency,
    form.adults,
    form.children,
    form.cabinType,
    form.infants,
    selectedDateEntry?.cabins,
    selectedOffer,
  ]);

  const priceLabel = useMemo(() => {
    if (selectedCabinPrice == null) return "";
    return `${formatMoney(selectedCabinPrice)} ${CURRENCY_SYMBOL[currency]}`;
  }, [currency, selectedCabinPrice]);

  const guestSummary = useMemo(() => {
    const parts = [`${form.adults} дор.`];
    if (form.children) parts.push(`${form.children} дит.`);
    if (form.infants) parts.push(`${form.infants} нем.`);
    return parts.join(", ");
  }, [form.adults, form.children, form.infants]);

  const symbol = CURRENCY_SYMBOL[currency];

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
    const firstOffers = initialEntry?.offers ?? [];
    const firstCabins = firstOffers.length
      ? CABIN_ORDER.filter((cat) =>
          firstOffers.some((offer) => offer.cabinCategory === cat),
        )
      : availableCabinsForDate(
          initialEntry?.cabins ?? cruise.from_price,
          currency,
        );
    const firstCategory = firstCabins[0] ?? "";
    const firstOffer =
      firstOffers.find((offer) => offer.cabinCategory === firstCategory) ??
      firstOffers[0];
    const adults =
      initialGuests?.adults && initialGuests.adults > 0
        ? initialGuests.adults
        : 2;
    setCategoryFilter(firstCategory);
    setForm({
      ...initialForm,
      cruiseDate: firstDate,
      cabinType: firstOffer?.cabinCategory || firstCategory,
      offerKey: firstOffer ? offerKeyOf(firstOffer) : "",
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

  const selectCategory = (category: string) => {
    setCategoryFilter(category);
    const firstInCat = offers.find((offer) => offer.cabinCategory === category);
    setForm((current) => ({
      ...current,
      cabinType: category,
      offerKey: firstInCat ? offerKeyOf(firstInCat) : "",
    }));
  };

  const selectOffer = (offer: CruiseCabinOffer) => {
    setForm((current) => ({
      ...current,
      cabinType: offer.cabinCategory || current.cabinType,
      offerKey: offerKeyOf(offer),
    }));
  };

  const phoneValid = isValidUaPhone(form.phone);
  const cabinSelected = hasOffers
    ? Boolean(form.offerKey && selectedOffer)
    : Boolean(form.cabinType);
  const canContinueToForm =
    Boolean(form.cruiseDate) && cabinSelected && form.adults >= 1;
  const canSubmit =
    form.name.trim().length >= 2 &&
    phoneValid &&
    canContinueToForm &&
    !submitting;

  const handleDateChange = (date: string) => {
    const entry = upcomingDates.find((item) => item.date === date);
    const nextOffers = entry?.offers ?? [];
    const cabins = nextOffers.length
      ? CABIN_ORDER.filter((cat) =>
          nextOffers.some((offer) => offer.cabinCategory === cat),
        )
      : availableCabinsForDate(entry?.cabins ?? cruise?.from_price, currency);
    const nextCategory = cabins.includes(
      form.cabinType as (typeof CABIN_ORDER)[number],
    )
      ? form.cabinType
      : (cabins[0] ?? "");
    const nextOffer =
      nextOffers.find((offer) => offer.cabinCategory === nextCategory) ??
      nextOffers[0];
    setCategoryFilter(nextCategory);
    setForm((current) => ({
      ...current,
      cruiseDate: date,
      cabinType: nextOffer?.cabinCategory || nextCategory,
      offerKey: nextOffer ? offerKeyOf(nextOffer) : "",
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
            route: routeFull,
            nights: cruise.nights || 1,
            cruiseDate: form.cruiseDate,
            cruiseDateEnd,
            cabinType: form.cabinType,
            cabinCode: selectedOffer?.cabinCode,
            cabinName: selectedOffer?.cabinName,
            tariffName: selectedOffer?.tariffName,
            priceLabel,
            adults: form.adults,
            children: form.children,
            infants: form.infants,
            shipBuiltYear: cruise.ship_built_year,
            shipRenovatedYear: cruise.ship_renovated_year,
            shipClass: cruise.ship_class,
            companyClass: cruise.company_class,
            shipSize: cruise.ship_size,
            starRating: cruise.star_rating,
            reviewScore: cruise.review_score ?? undefined,
            reviewCount: cruise.review_count,
            bookingUrl: bookingUrl || undefined,
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
        className="relative z-[101] w-full max-w-[600px] overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-caption font-semibold text-[color:var(--color-brand)]">
              {step === "cabins"
                ? "Крок 1 з 2 · Вибір каюти"
                : "Крок 2 з 2 · Заявка"}
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
            <p className="text-caption font-semibold text-[color:var(--color-brand)]">
              {cruise.region_name || "Круїз"}
            </p>
            <p className="text-body mt-1 font-semibold text-[color:var(--color-black)]">
              {cruise.liner_name}
            </p>
            <p className="text-caption mt-1 text-subtitle">
              {cruise.cruise_title}
              {cruise.company_class ? ` · ${cruise.company_class}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {cruise.ship_built_year ? (
                <MetaChip>{cruise.ship_built_year} р.</MetaChip>
              ) : null}
              {cruise.ship_renovated_year ? (
                <MetaChip>Реновація {cruise.ship_renovated_year}</MetaChip>
              ) : null}
              {cruise.ship_class ? (
                <MetaChip>Клас: {cruise.ship_class}</MetaChip>
              ) : null}
              {cruise.ship_size ? (
                <MetaChip>Розмір: {cruise.ship_size}</MetaChip>
              ) : null}
              {cruise.star_rating != null ? (
                <MetaChip>{cruise.star_rating}★</MetaChip>
              ) : null}
            </div>

            {sailingLabel ? (
              <p className="text-caption mt-3 font-semibold text-[color:var(--color-black)]">
                {sailingLabel}
              </p>
            ) : null}

            <p className="text-caption mt-2 leading-relaxed text-subtitle">
              <span className="font-semibold text-[color:var(--color-black)]">
                Маршрут:{" "}
              </span>
              {routeFull}
            </p>

            {step === "form" && cabinSelected ? (
              <p className="text-caption mt-3 font-semibold text-[color:var(--color-brand)]">
                {selectedOffer
                  ? `${selectedOffer.cabinCode} · ${selectedOffer.tariffName}`
                  : form.cabinType}
                {priceLabel ? ` · ${priceLabel}` : ""} · {guestSummary}
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
                      {cruise.nights
                        ? ` → ${formatDate(addDaysIso(item.date!, cruise.nights))}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <p className="text-caption mb-2 text-subtitle">
                  Кількість туристів *
                </p>
                <p className="text-caption mb-2.5 text-subtitle">
                  Ціни нижче перераховуються під обрану кількість гостей (база в
                  каталозі — за каюту на 2 дорослих).
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

              <div>
                <p className="text-caption mb-1 text-subtitle">
                  Тип каюти *
                </p>
                <p className="text-caption mb-2.5 text-subtitle">
                  Вартість за каюту на {guestSummary}, з портами та чайовими.
                </p>

                {cabinOptions.length === 0 ? (
                  <p className="rounded-card bg-amber-50 px-3 py-2 text-caption text-amber-800">
                    Для цієї дати немає цін по каютах. Оберіть іншу дату або
                    залиште заявку — менеджер уточнить варіанти.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cabinOptions.map((cabin) => {
                      const base =
                        cabinPrice(
                          selectedDateEntry?.cabins,
                          cabin,
                          currency,
                        ) ?? cabinPrice(cruise.from_price, cabin, currency);
                      const fromOffers = offers
                        .filter((offer) => offer.cabinCategory === cabin)
                        .map((offer) => offer.price?.[currency])
                        .filter((v): v is number => v != null);
                      const minBase =
                        fromOffers.length > 0
                          ? Math.min(...fromOffers)
                          : base;
                      const scaled = scalePrice(minBase ?? null);
                      const selected =
                        (categoryFilter || form.cabinType) === cabin;
                      return (
                        <button
                          key={cabin}
                          type="button"
                          onClick={() => selectCategory(cabin)}
                          className={`min-w-[7.5rem] flex-1 rounded-card border px-3 py-2.5 text-left transition-colors sm:flex-none ${
                            selected
                              ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-light)]"
                              : "border-[color:var(--color-line)] bg-white hover:border-[color:var(--color-brand)]/40"
                          }`}
                        >
                          <span className="text-caption font-semibold text-[color:var(--color-black)]">
                            {cabin}
                          </span>
                          <span className="text-caption mt-1 block text-[color:var(--color-brand)]">
                            {scaled != null
                              ? `від ${formatMoney(scaled)} ${symbol}`
                              : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {hasOffers ? (
                <div>
                  <p className="text-caption mb-1 text-subtitle">
                    Обрати тариф / каюту *
                  </p>
                  <p className="text-caption mb-2.5 text-subtitle">
                    Конкретний код каюти та тариф (як на 4gates).
                  </p>
                  <div className="space-y-2">
                    {filteredOffers.map((offer) => {
                      const base = offer.price?.[currency] ?? null;
                      const scaled = scalePrice(base);
                      const key = offerKeyOf(offer);
                      const selected = form.offerKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectOffer(offer)}
                          className={`flex w-full items-start justify-between gap-3 rounded-card border px-4 py-3 text-left transition-colors ${
                            selected
                              ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-light)]"
                              : "border-[color:var(--color-line)] bg-white hover:border-[color:var(--color-brand)]/40"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-caption font-bold text-[color:var(--color-black)]">
                              {offer.cabinCode}
                              <span className="ml-2 font-semibold text-[color:var(--color-brand)]">
                                {offer.tariffName}
                              </span>
                            </p>
                            <p className="text-caption mt-1 text-subtitle">
                              {offer.cabinName}
                            </p>
                            <p className="text-caption mt-0.5 text-subtitle">
                              {[
                                offer.areaM2 != null
                                  ? `${offer.areaM2} м²`
                                  : null,
                                offer.decks ? `пал: ${offer.decks}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-body font-bold text-[color:var(--color-brand)]">
                              {scaled != null
                                ? `${formatMoney(scaled)} ${symbol}`
                                : "—"}
                            </p>
                            <p className="text-caption text-subtitle">
                              {selected ? "Обрано" : "Вибрати"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-caption mb-2 text-subtitle">
                    Деталі каюти
                  </p>
                  {(categoryFilter || form.cabinType) && (
                    <p className="rounded-card border border-[color:var(--color-line)] bg-white px-4 py-3 text-caption text-subtitle">
                      {
                        CABIN_HINTS[
                          (categoryFilter ||
                            form.cabinType) as (typeof CABIN_ORDER)[number]
                        ]
                      }
                      . Повна матриця тарифів (IR1, FREE UPGRADE…) для цього
                      рейсу ще не в базі — відкрийте 4gates або менеджер
                      підбере.
                    </p>
                  )}
                  {cabinOptions.length > 0 ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {cabinOptions.map((cabin) => {
                        const base =
                          cabinPrice(
                            selectedDateEntry?.cabins,
                            cabin,
                            currency,
                          ) ?? cabinPrice(cruise.from_price, cabin, currency);
                        const scaled = scalePrice(base);
                        const selected = form.cabinType === cabin;
                        return (
                          <button
                            key={cabin}
                            type="button"
                            onClick={() => {
                              setCategoryFilter(cabin);
                              updateField("cabinType", cabin);
                            }}
                            className={`rounded-card border px-4 py-3 text-left transition-colors ${
                              selected
                                ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-light)]"
                                : "border-[color:var(--color-line)] bg-white"
                            }`}
                          >
                            <span className="text-body font-semibold text-[color:var(--color-black)]">
                              {cabin}
                            </span>
                            <span className="text-body mt-2 block font-bold text-[color:var(--color-brand)]">
                              {scaled != null
                                ? `${formatMoney(scaled)} ${symbol}`
                                : "Ціну уточнимо"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}

              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary btn-secondary--block inline-flex items-center justify-center gap-2"
                >
                  Повний вибір тарифів на 4gates
                  <ExternalLink className="h-4 w-4" strokeWidth={2} />
                </a>
              ) : null}

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
                Змінити каюту або гостей
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
                  placeholder="Побажання щодо каюти, палуби, харчування..."
                />
              </Field>

              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-caption font-semibold text-[color:var(--color-brand)]"
                >
                  Відкрити тарифи цієї дати на 4gates
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                </a>
              ) : null}

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
                {submitting
                  ? "Надсилання..."
                  : "Надіслати заявку на бронювання"}
              </button>

              <p className="text-caption text-center text-subtitle">
                Орієнтовна ціна за каюту на {guestSummary}. Менеджер підтвердить
                точний тариф і наявність.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
