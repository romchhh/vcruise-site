"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import CabinOffersTable from "./CabinOffersTable";
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
import {
  fetchCruiseOffers,
  getCachedCruiseOffers,
} from "@/lib/cruise-search/fetch-cruise-offers-client";
import {
  offerCabinSubtitle,
  offerMetaLine,
} from "@/lib/cruise-search/offer-display";
import {
  normalizeCruiseCabinOffer,
  normalizeTariffName,
  offerKeyOf,
} from "@/lib/cruise-search/offer-key";
import {
  cabinPlacementLabel,
  isReferenceOffersParty,
  offersRequestKey,
} from "@/lib/cruise-search/offers-request-key";

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
  variant?: "modal" | "page";
  /** Page layout: full-width cabin table rendered outside the sticky sidebar. */
  onOffersPanel?: (node: ReactNode) => void;
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

function pickFormAfterOffers(
  nextOffers: CruiseCabinOffer[],
  current: FormState,
): Pick<FormState, "cabinType" | "offerKey"> {
  if (!nextOffers.length) {
    return { cabinType: current.cabinType, offerKey: "" };
  }

  if (
    current.offerKey &&
    nextOffers.some((offer) => offerKeyOf(offer) === current.offerKey)
  ) {
    const match = nextOffers.find(
      (offer) => offerKeyOf(offer) === current.offerKey,
    )!;
    return {
      cabinType: match.cabinCategory || current.cabinType,
      offerKey: current.offerKey,
    };
  }

  const activeCategory =
    current.cabinType ||
    nextOffers.find((offer) => offer.cabinCategory)?.cabinCategory ||
    "";
  const inCategory = nextOffers.filter(
    (offer) => offer.cabinCategory === activeCategory,
  );
  const pick = inCategory[0] ?? nextOffers[0];

  return {
    cabinType: pick.cabinCategory || current.cabinType,
    offerKey: offerKeyOf(pick),
  };
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

function BookingSpinner({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-3 py-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="h-9 w-9 shrink-0 animate-spin rounded-full border-[3px] border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
        aria-hidden
      />
      <span className="text-caption text-subtitle">{label}</span>
    </div>
  );
}

function GuestStepper({
  label,
  hint,
  value,
  min,
  onChange,
  withDivider,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  onChange: (next: number) => void;
  withDivider?: boolean;
}) {
  const stepBtn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--color-brand)] bg-white text-[color:var(--color-brand)] transition-colors hover:bg-[color:var(--color-brand-light)] disabled:cursor-not-allowed disabled:border-[color:var(--color-line)] disabled:text-[color:var(--color-silver)] disabled:hover:bg-white";

  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        withDivider ? "border-t border-[color:var(--color-line)]" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-caption font-semibold text-[color:var(--color-black)]">
          {label}
        </p>
        <p className="text-caption mt-0.5 text-subtitle">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label={`Менше: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={stepBtn}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <span className="min-w-[1.25rem] text-center text-body font-semibold tabular-nums text-[color:var(--color-black)]">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Більше: ${label}`}
          disabled={value >= 12}
          onClick={() => onChange(Math.min(12, value + 1))}
          className={stepBtn}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
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
  variant = "modal",
  onOffersPanel,
}: CruiseBookingModalProps) {
  const honeypotId = useId();
  const formOpenedAtRef = useRef(0);
  const offersRequestIdRef = useRef(0);
  const offersLoadKeyRef = useRef("");
  const open = Boolean(cruise);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("cabins");
  const [form, setForm] = useState<FormState>(initialForm);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [liveOffers, setLiveOffers] = useState<CruiseCabinOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersResolved, setOffersResolved] = useState(false);
  const [guestSpecificPrices, setGuestSpecificPrices] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

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

  const offers = useMemo(() => {
    const reference = form.adults === 2 && form.children === 0;
    if (liveOffers.length) return liveOffers;
    if (reference) return selectedDateEntry?.offers ?? [];
    return [];
  }, [form.adults, form.children, liveOffers, selectedDateEntry?.offers]);
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

  const scalePrice = useCallback(
    (base: number | null | undefined) => {
      if (base == null) return null;
      if (guestSpecificPrices) return base;
      return scaleCabinPriceForGuests(
        base,
        form.adults,
        form.children,
        form.infants,
      );
    },
    [
      guestSpecificPrices,
      form.adults,
      form.children,
      form.infants,
    ],
  );

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
    guestSpecificPrices,
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

  const guestQuery = {
    adults: form.adults,
    children: form.children,
    infants: form.infants,
  };
  const referenceParty = isReferenceOffersParty(guestQuery);
  const noCabins =
    Boolean(bookingUrl) &&
    offersResolved &&
    !offersLoading &&
    offers.length === 0 &&
    offersLoadKeyRef.current === offersRequestKey(bookingUrl, guestQuery);

  const applyOffers = (
    nextOffers: CruiseCabinOffer[],
    guestSpecific = false,
  ) => {
    setLiveOffers(nextOffers.map(normalizeCruiseCabinOffer));
    setGuestSpecificPrices(guestSpecific && nextOffers.length > 0);
    setOffersResolved(true);
    setForm((current) => {
      const picked = pickFormAfterOffers(nextOffers, current);
      if (picked.cabinType) setCategoryFilter(picked.cabinType);
      return { ...current, ...picked };
    });
  };

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
    const dates = getUpcomingDates(cruise);
    const preferredEntry = preferredDate
      ? dates.find((item) => item.date === preferredDate)
      : undefined;
    const initialEntry = preferredEntry ?? dates[0];
    const firstDate = initialEntry?.date ?? "";
    const adults =
      initialGuests?.adults && initialGuests.adults > 0
        ? initialGuests.adults
        : 2;
    const children = initialGuests?.children ?? 0;
    const infants = initialGuests?.infants ?? 0;

    const firstCabins = availableCabinsForDate(
      initialEntry?.cabins ?? cruise.from_price,
      currency,
    );
    const firstCategory = firstCabins[0] ?? "";
    setCategoryFilter(firstCategory);
    setForm({
      ...initialForm,
      cruiseDate: firstDate,
      cabinType: firstCategory,
      offerKey: "",
      adults,
      children,
      infants,
    });
    setLiveOffers([]);
    setOffersResolved(false);
    setGuestSpecificPrices(false);
    offersLoadKeyRef.current = "";
    const openedAt = Date.now();
    formOpenedAtRef.current = openedAt;
    setStartedAt(openedAt);
  }, [
    open,
    cruise,
    preferredDate,
    currency,
    initialGuests?.adults,
    initialGuests?.children,
    initialGuests?.infants,
  ]);

  useEffect(() => {
    if (!open || variant === "page") return;

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
  }, [open, onClose, variant]);

  useEffect(() => {
    if (variant !== "page" || !contactModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [contactModalOpen, variant]);

  useEffect(() => {
    if (!open) {
      offersRequestIdRef.current += 1;
      offersLoadKeyRef.current = "";
      return;
    }

    if (!bookingUrl) {
      setLiveOffers([]);
      setOffersLoading(false);
      setOffersResolved(true);
      setGuestSpecificPrices(false);
      offersLoadKeyRef.current = "";
      return;
    }

    const loadKey = offersRequestKey(bookingUrl, guestQuery);
    const seedOffers = referenceParty ? (selectedDateEntry?.offers ?? []) : [];

    if (seedOffers.length > 0) {
      setLiveOffers([]);
      setGuestSpecificPrices(false);
      setOffersResolved(true);
      setOffersLoading(false);
      offersLoadKeyRef.current = loadKey;
      return;
    }

    const cached = getCachedCruiseOffers(bookingUrl, guestQuery);

    if (cached) {
      applyOffers(cached.offers, cached.guestSpecific);
      setOffersLoading(false);
      offersLoadKeyRef.current = loadKey;
      return;
    }

    if (offersLoadKeyRef.current === loadKey) {
      return;
    }

    const guestsOnlyChange =
      offersLoadKeyRef.current.startsWith(`${bookingUrl}|`) &&
      offersLoadKeyRef.current !== loadKey;
    const debounceMs = guestsOnlyChange ? 450 : 0;

    const requestId = offersRequestIdRef.current + 1;
    offersRequestIdRef.current = requestId;
    const showBlockingLoader = !liveOffers.length;
    if (showBlockingLoader) {
      setOffersLoading(true);
      setOffersResolved(false);
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = await fetchCruiseOffers({
            bookingUrl,
            guests: guestQuery,
          });

          if (requestId !== offersRequestIdRef.current) return;

          applyOffers(payload.offers, payload.guestSpecific);
          offersLoadKeyRef.current = loadKey;
        } catch {
          if (requestId !== offersRequestIdRef.current) return;

          if (showBlockingLoader) {
            setLiveOffers([]);
          }
          setOffersResolved(true);
          setGuestSpecificPrices(false);
        } finally {
          if (requestId === offersRequestIdRef.current) {
            setOffersLoading(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    open,
    bookingUrl,
    form.adults,
    form.children,
    referenceParty,
    selectedDateEntry?.offers,
  ]);

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

  const selectOffer = useCallback((offer: CruiseCabinOffer) => {
    setForm((current) => ({
      ...current,
      cabinType: offer.cabinCategory || current.cabinType,
      offerKey: offerKeyOf(offer),
    }));
  }, []);

  const phoneValid = isValidUaPhone(form.phone);
  const cabinSelected = hasOffers
    ? Boolean(form.offerKey && selectedOffer)
    : Boolean(form.cabinType);
  const canContinueToForm =
    Boolean(form.cruiseDate) &&
    cabinSelected &&
    form.adults >= 1 &&
    !(bookingUrl && offersLoading);
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
    const nextCategory = cabins.includes(
      form.cabinType as (typeof CABIN_ORDER)[number],
    )
      ? form.cabinType
      : (cabins[0] ?? "");
    setCategoryFilter(nextCategory);
    setForm((current) => ({
      ...current,
      cruiseDate: date,
      cabinType: nextCategory,
      offerKey: "",
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

  const isPage = variant === "page";

  useEffect(() => {
    if (!isPage || !onOffersPanel) return;

    if (!cruise) {
      onOffersPanel(null);
      return;
    }

    const emptyMessage = noCabins
      ? `На жаль, немає вільних кают при розміщенні на ${cabinPlacementLabel(form.adults, form.children, form.infants)}. Спробуйте вибрати меншу кількість.`
      : null;

    onOffersPanel(
      <CabinOffersTable
        offers={filteredOffers}
        currency={currency}
        selectedKey={form.offerKey}
        scalePrice={scalePrice}
        onSelect={selectOffer}
        loading={offersLoading && !hasOffers}
        emptyMessage={emptyMessage}
      />,
    );

    return () => onOffersPanel(null);
  }, [
    isPage,
    onOffersPanel,
    cruise,
    filteredOffers,
    currency,
    form.offerKey,
    form.adults,
    form.children,
    form.infants,
    offersLoading,
    hasOffers,
    noCabins,
    scalePrice,
    selectOffer,
  ]);

  if (!mounted || !open || !cruise) return null;

  const closeContactModal = () => {
    setContactModalOpen(false);
    if (!success) setStep("cabins");
  };

  const openContactModal = () => {
    setStep("form");
    setContactModalOpen(true);
  };

  const panel = (
    <div
      role={isPage ? "region" : "dialog"}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="cruise-booking-modal-title"
      className={
        isPage
          ? "w-full overflow-hidden rounded-card border border-[color:var(--color-line)] bg-white"
          : "relative z-[101] w-full max-w-[600px] overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
      }
    >
      <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          {isPage ? null : (
            <p className="text-caption font-semibold text-[color:var(--color-brand)]">
              {step === "cabins" ? "1 / 2" : "2 / 2"}
            </p>
          )}
          <h2
            id="cruise-booking-modal-title"
            className="text-h4 mt-1 font-bold text-[color:var(--color-black)]"
          >
            {isPage
              ? "Параметри бронювання"
              : success
                ? "Заявку надіслано"
                : step === "cabins"
                  ? "Каюта та гості"
                  : "Контакти"}
          </h2>
        </div>
        {!isPage ? (
          <button
            type="button"
            onClick={onClose}
            className="btn-control flex-shrink-0"
            aria-label="Закрити вікно"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        className={
          isPage
            ? "relative px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
            : "relative max-h-[calc(100vh-2rem)] overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
        }
      >
          {submitting ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-b-card bg-white/85 backdrop-blur-[2px]"
              aria-busy="true"
            >
              <BookingSpinner label="Надсилаємо заявку…" />
            </div>
          ) : null}

          {isPage ? null : (
            <div className="rounded-card bg-[color:var(--color-surface-muted)] px-3.5 py-2.5 sm:px-4 sm:py-3">
              <p className="text-body font-semibold text-[color:var(--color-black)]">
                {cruise.liner_name}
              </p>
              <p className="text-caption mt-0.5 text-subtitle">
                {cruise.region_name}
                {sailingLabel ? ` · ${sailingLabel}` : ""}
              </p>
              {step === "form" && cabinSelected ? (
                <p className="text-caption mt-2 font-semibold text-[color:var(--color-brand)]">
                  {selectedOffer
                    ? `${selectedOffer.cabinCode} · ${selectedOffer.tariffName}`
                    : form.cabinType}
                  {priceLabel ? ` · ${priceLabel}` : ""} · {guestSummary}
                </p>
              ) : null}
            </div>
          )}

          {success && !isPage ? (
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
          ) : isPage || step === "cabins" ? (
            <div className="mt-3 space-y-3.5">
              <Field label="Дата *">
                <select
                  required
                  value={form.cruiseDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
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
                <p className="text-caption mb-1.5 text-subtitle">Гості *</p>
                <div className="rounded-card border border-[color:var(--color-line)] bg-white px-4">
                  {GUEST_FIELDS.map((field, index) => (
                    <GuestStepper
                      key={field.key}
                      label={field.label}
                      hint={field.hint}
                      value={form[field.key]}
                      min={field.key === "adults" ? 1 : 0}
                      withDivider={index > 0}
                      onChange={(next) => updateField(field.key, next)}
                    />
                  ))}
                </div>
              </div>

              {!isPage && noCabins ? (
                <p className="rounded-card bg-amber-50 px-3 py-2 text-caption text-amber-800">
                  На жаль, немає вільних кают при розміщенні на{" "}
                  {cabinPlacementLabel(form.adults, form.children, form.infants)}
                  . Спробуйте вибрати меншу кількість.
                </p>
              ) : (
              <>
              <div>
                <p className="text-caption mb-2 text-subtitle">
                  Тип каюти *
                  {!guestSpecificPrices ? (
                    <span className="text-[color:var(--color-silver)]">
                      {" "}
                      · орієнтовно на {guestSummary}
                    </span>
                  ) : null}
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

              {!isPage && offersLoading && !hasOffers ? (
                <BookingSpinner label="Підбираємо каюти та тарифи…" />
              ) : null}

              {!isPage && hasOffers ? (
                <div>
                  <p className="text-caption mb-2 text-subtitle">
                    Каюта та тариф *
                  </p>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5 sm:max-h-60">
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
                          className={`flex w-full items-start justify-between gap-3 rounded-card border px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3 ${
                            selected
                              ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-light)]"
                              : "border-[color:var(--color-line)] bg-white hover:border-[color:var(--color-brand)]/40"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-caption font-bold text-[color:var(--color-black)]">
                              <span>{offer.cabinCode}</span>
                              <span className="font-semibold text-[color:var(--color-brand)]">
                                {" · "}
                                {normalizeTariffName(offer.tariffName)}
                              </span>
                            </p>
                            <p className="text-caption mt-1 text-subtitle">
                              {offerCabinSubtitle(offer)}
                            </p>
                            {offerMetaLine(offer) ? (
                              <p className="text-caption mt-0.5 text-subtitle">
                                {offerMetaLine(offer)}
                              </p>
                            ) : null}
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
                  <p className="text-caption mt-2 text-[color:var(--color-silver)]">
                    * Вартість вказана за каюту (на вибрану кількість гостей),
                    включаючи портові збори та чайові
                  </p>
                </div>
              ) : null}

              {isPage && selectedOffer ? (
                <div className="rounded-card border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand-light)] px-3.5 py-3">
                  <p className="text-caption text-[color:var(--color-silver)]">
                    Обрано
                  </p>
                  <p className="text-caption mt-1 font-bold text-[color:var(--color-black)]">
                    {selectedOffer.cabinCode}
                    <span className="font-semibold text-[color:var(--color-brand)]">
                      {" · "}
                      {normalizeTariffName(selectedOffer.tariffName)}
                    </span>
                  </p>
                  {priceLabel ? (
                    <p className="text-body mt-1 font-bold text-[color:var(--color-brand)]">
                      {priceLabel}
                    </p>
                  ) : null}
                </div>
              ) : isPage && hasOffers ? (
                <p className="text-caption text-[color:var(--color-silver)]">
                  Оберіть каюту та тариф у таблиці нижче.
                </p>
              ) : null}
              </>
              )}

              <button
                type="button"
                disabled={!canContinueToForm}
                onClick={isPage ? openContactModal : () => setStep("form")}
                className="btn-primary btn-primary--block disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPage ? "Звʼязатися щодо бронювання" : "Далі"}
              </button>
            </div>
          ) : !isPage ? (
            <form className="mt-3 space-y-3" onSubmit={handleSubmit} noValidate>
              <button
                type="button"
                onClick={() => setStep("cabins")}
                className="inline-flex items-center gap-1.5 text-caption font-semibold text-[color:var(--color-brand)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад
              </button>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Ім'я *">
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    className="field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                    placeholder="Ім'я"
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
                      updateField(
                        "phone",
                        formatUaPhoneInput(event.target.value),
                      )
                    }
                    onFocus={(event) => {
                      if (!event.target.value.trim()) {
                        updateField("phone", "+380 ");
                      }
                    }}
                    className="field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                    placeholder="+380 (XX) XXX-XX-XX"
                  />
                </Field>
              </div>

              <Field label="Коментар (необов'язково)">
                <textarea
                  value={form.details}
                  onChange={(event) =>
                    updateField("details", event.target.value)
                  }
                  rows={2}
                  maxLength={1000}
                  className="field-control w-full resize-none bg-white px-3 py-2.5 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                  placeholder="Побажання, якщо є"
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
                Надіслати заявку
              </button>
            </form>
          ) : null}
      </div>
    </div>
  );

  const contactModal =
    isPage && contactModalOpen
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button
              type="button"
              aria-label="Закрити"
              className="absolute inset-0 bg-black/45"
              onClick={closeContactModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cruise-contact-modal-title"
              className="relative z-[101] w-full max-w-[520px] overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
            >
              <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
                <div className="min-w-0">
                  <p className="text-caption font-semibold text-[color:var(--color-brand)]">
                    Заявка
                  </p>
                  <h2
                    id="cruise-contact-modal-title"
                    className="text-h4 mt-1 font-bold text-[color:var(--color-black)]"
                  >
                    {success ? "Заявку надіслано" : "Звʼязатися з менеджером"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeContactModal}
                  className="btn-control flex-shrink-0"
                  aria-label="Закрити"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
                {submitting ? (
                  <BookingSpinner label="Надсилаємо заявку…" />
                ) : null}
                <div className="rounded-card bg-[color:var(--color-surface-muted)] px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <p className="text-body font-semibold text-[color:var(--color-black)]">
                    {cruise.liner_name}
                  </p>
                  <p className="text-caption mt-0.5 text-subtitle">
                    {sailingLabel} · {guestSummary}
                  </p>
                  {cabinSelected ? (
                    <p className="text-caption mt-2 font-semibold text-[color:var(--color-brand)]">
                      {selectedOffer
                        ? `${selectedOffer.cabinCode} · ${selectedOffer.tariffName}`
                        : form.cabinType}
                      {priceLabel ? ` · ${priceLabel}` : ""}
                    </p>
                  ) : null}
                </div>
                {success ? (
                  <div className="py-6 text-center">
                    <p className="text-body font-semibold text-[color:var(--color-black)]">
                      Дякуємо! Менеджер зв&apos;яжеться з вами для підтвердження
                      бронювання.
                    </p>
                    <button
                      type="button"
                      onClick={closeContactModal}
                      className="btn-primary mt-5"
                    >
                      Закрити
                    </button>
                  </div>
                ) : (
                  <form
                    className="mt-3 space-y-3"
                    onSubmit={handleSubmit}
                    noValidate
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Ім'я *">
                        <input
                          type="text"
                          required
                          autoComplete="name"
                          value={form.name}
                          onChange={(event) =>
                            updateField("name", event.target.value)
                          }
                          className="field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                          placeholder="Ім'я"
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
                            updateField(
                              "phone",
                              formatUaPhoneInput(event.target.value),
                            )
                          }
                          onFocus={(event) => {
                            if (!event.target.value.trim()) {
                              updateField("phone", "+380 ");
                            }
                          }}
                          className="field-control h-11 w-full bg-white px-3 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                          placeholder="+380 (XX) XXX-XX-XX"
                        />
                      </Field>
                    </div>
                    <Field label="Коментар (необов'язково)">
                      <textarea
                        value={form.details}
                        onChange={(event) =>
                          updateField("details", event.target.value)
                        }
                        rows={2}
                        maxLength={1000}
                        className="field-control w-full resize-none bg-white px-3 py-2.5 text-body text-[color:var(--color-black)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--color-brand)]/20"
                        placeholder="Побажання, якщо є"
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
                      Надіслати заявку
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (isPage) {
    return (
      <>
        {panel}
        {contactModal}
      </>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      {panel}
    </div>,
    document.body,
  );
}
