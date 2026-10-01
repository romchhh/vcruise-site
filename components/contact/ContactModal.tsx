"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";
import {
  formatUaPhoneInput,
  isValidUaPhone,
} from "@/lib/contact/phone";
import BrandMessengerIcon from "@/components/icons/BrandMessengerIcon";
import { messengerBrandHex } from "@/lib/messenger-brands";
import { getMessengerLinks, type MessengerId } from "@/lib/messengers";

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
};

const initialForm: FormState = {
  name: "",
  phone: "+380 ",
  email: "",
};

const pillInputClass =
  "h-14 w-full rounded-full border border-[#E5E0DC] bg-[#F3EEEA] px-6 text-body text-[color:var(--color-black)] outline-none transition-colors placeholder:text-[#9A928C] focus:border-[#D0C8C2]";

const messengerLabels: Record<MessengerId, string> = {
  telegram: "Telegram",
  viber: "Viber",
};

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const honeypotId = useId();
  const formOpenedAtRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const messengerLinks = useMemo(() => getMessengerLinks(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStartedAt(null);
      return;
    }

    setError("");
    setSuccess(false);
    setForm(initialForm);
    const openedAt = Date.now();
    formOpenedAtRef.current = openedAt;
    setStartedAt(openedAt);
  }, [open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const phoneValid = isValidUaPhone(form.phone);
  const emailValid = isValidEmail(form.email);
  const canSubmit =
    form.name.trim().length >= 2 && phoneValid && emailValid && !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !startedAt) return;

    setSubmitting(true);
    setError("");

    const honeypot =
      (document.getElementById(honeypotId) as HTMLInputElement | null)?.value ??
      "";

    const emailTrimmed = form.email.trim();
    const details = emailTrimmed ? `Email: ${emailTrimmed}` : undefined;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          details,
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

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Закрити"
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative z-[101] w-full max-w-[400px] overflow-hidden rounded-t-[32px] bg-white px-8 pb-8 pt-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:rounded-[32px] sm:pb-10 sm:pt-5"
      >
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#D8D2CC] sm:mb-6"
          aria-hidden
        />

        {success ? (
          <div className="py-4 text-center">
            <p className="text-body font-semibold text-[color:var(--color-black)]">
              Дякуємо! Ми зв&apos;яжемося з вами найближчим часом.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 flex h-14 w-full items-center justify-between rounded-full bg-black px-6 text-sm font-bold tracking-wide text-white uppercase"
            >
              <span>Закрити</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
              </span>
            </button>
          </div>
        ) : (
          <>
            <h2
              id="contact-modal-title"
              className="text-center text-[22px] font-bold leading-tight text-[color:var(--color-black)]"
            >
              Зв&apos;язатися з нами
            </h2>

            <form className="mt-6 space-y-3" onSubmit={handleSubmit} noValidate>
              <input
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={pillInputClass}
                placeholder="ім'я"
                maxLength={80}
              />

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
                className={pillInputClass}
                placeholder="телефон"
              />

              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className={pillInputClass}
                placeholder="пошта"
                maxLength={120}
              />

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
                <p className="px-2 text-center text-caption text-red-600">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 flex h-14 w-full items-center justify-between rounded-full bg-black px-6 text-sm font-bold tracking-[0.06em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{submitting ? "Надсилання…" : "Надіслати"}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </button>
            </form>

            {messengerLinks.length > 0 ? (
              <div className="mt-8 text-center">
                <p className="text-caption text-[#B8B0AA]">Або</p>
                <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-caption text-[color:var(--color-black)]">
                  <span>Напишіть нам у</span>
                  {messengerLinks.map((link, index) => (
                    <span key={link.id} className="inline-flex items-center gap-1.5">
                      {index > 0 ? (
                        <span className="text-[#B8B0AA]" aria-hidden>·</span>
                      ) : null}
                      <a
                        href={link.href}
                        target={
                          link.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                          link.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                        style={{ color: messengerBrandHex(link.id) }}
                      >
                        <BrandMessengerIcon
                          brand={link.id}
                          size={16}
                          color="brand"
                        />
                        {messengerLabels[link.id]}
                      </a>
                    </span>
                  ))}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
