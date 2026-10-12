"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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

const messengerLabels: Record<MessengerId, string> = {
  telegram: "Telegram",
  viber: "Viber",
};

function ContactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="contact-field-label">{label}</span>
      {children}
    </label>
  );
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function scrollFieldIntoView(element: HTMLElement) {
  window.setTimeout(() => {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 280);
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
  const [keyboardInset, setKeyboardInset] = useState(0);
  const messengerLinks = useMemo(() => getMessengerLinks(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStartedAt(null);
      setKeyboardInset(0);
      return;
    }

    setError("");
    setSuccess(false);
    setForm(initialForm);
    const openedAt = Date.now();
    formOpenedAtRef.current = openedAt;
    setStartedAt(openedAt);
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const gap = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      setKeyboardInset(gap > 48 ? gap : 0);
    };

    updateKeyboardInset();
    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
    };
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={
        keyboardInset > 0
          ? { paddingBottom: keyboardInset }
          : undefined
      }
    >
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
        className="relative z-[101] flex max-h-[min(92dvh,640px)] w-full max-w-[400px] flex-col overflow-hidden rounded-t-[var(--radius-shell)] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:max-h-none sm:rounded-[var(--radius-shell-lg)]"
      >
        <div className="relative shrink-0 px-5 pb-2 pt-3 sm:px-8 sm:pb-0 sm:pt-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-black)] transition-colors hover:bg-[color:var(--color-surface-hover)] sm:right-4 sm:top-4"
            aria-label="Закрити вікно"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>

          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--color-line)] sm:mb-5"
            aria-hidden
          />

          {!success ? (
            <h2
              id="contact-modal-title"
              className="text-h4 text-center font-bold text-[color:var(--color-black)]"
            >
              {"Зв'язатися з нами"}
            </h2>
          ) : null}
        </div>

        <div
          className="contact-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-10"
        >
          {success ? (
            <div className="py-2 text-center sm:py-4">
              <h2
                id="contact-modal-title"
                className="text-h4 font-bold text-[color:var(--color-black)]"
              >
                Дякуємо!
              </h2>
              <p className="text-body mt-3 text-subtitle">
                {"Ми зв'яжемося з вами найближчим часом."}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary btn-primary--block mt-6"
              >
                Закрити
              </button>
            </div>
          ) : (
            <>
              <form
                className="mt-2 space-y-4 sm:mt-6"
                onSubmit={handleSubmit}
                noValidate
              >
                <ContactField label="Ім'я *">
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    onFocus={(event) => scrollFieldIntoView(event.currentTarget)}
                    className="contact-field-input"
                    placeholder="Ваше ім'я"
                    maxLength={80}
                  />
                </ContactField>

                <ContactField label="Телефон *">
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
                      scrollFieldIntoView(event.currentTarget);
                      if (!event.target.value.trim()) {
                        updateField("phone", "+380 ");
                      }
                    }}
                    className="contact-field-input"
                    placeholder="+380 (XX) XXX-XX-XX"
                  />
                </ContactField>

                <ContactField label="Пошта">
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    onFocus={(event) => scrollFieldIntoView(event.currentTarget)}
                    className="contact-field-input"
                    placeholder="email@example.com"
                    maxLength={120}
                  />
                </ContactField>

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
                  <p className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-center text-caption text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-primary btn-primary--block btn-card-detail disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Надсилання…" : "Надіслати"}
                </button>
              </form>

              {messengerLinks.length > 0 ? (
                <div className="mt-6 pb-1 text-center sm:mt-8">
                  <p className="text-caption text-subtitle">Або</p>
                  <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-caption text-[color:var(--color-black)]">
                    <span className="text-subtitle">Напишіть нам у</span>
                    {messengerLinks.map((link, index) => (
                      <span key={link.id} className="inline-flex items-center gap-1.5">
                        {index > 0 ? (
                          <span className="text-subtitle" aria-hidden>·</span>
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
      </div>
    </div>,
    document.body
  );
}
