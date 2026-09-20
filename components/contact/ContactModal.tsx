"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  formatUaPhoneInput,
  isValidUaPhone,
} from "@/lib/contact/phone";

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  name: string;
  phone: string;
  details: string;
};

const initialForm: FormState = {
  name: "",
  phone: "+380 ",
  details: "",
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

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const honeypotId = useId();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    setStartedAt(Date.now());
  }, [open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const phoneValid = isValidUaPhone(form.phone);
  const canSubmit = form.name.trim().length >= 2 && phoneValid && !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !startedAt) return;

    setSubmitting(true);
    setError("");

    const formElement = event.currentTarget;
    const honeypot = (
      formElement.elements.namedItem("_hp") as HTMLInputElement | null
    )?.value;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          details: form.details.trim(),
          _hp: honeypot ?? "",
          startedAt,
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
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative z-[101] w-full max-w-[440px] overflow-hidden rounded-t-card bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
          <h2
            id="contact-modal-title"
            className="text-h4 font-bold text-[color:var(--color-black)]"
          >
            Зв&apos;язатись з нами
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

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {success ? (
            <div className="py-6 text-center">
              <p className="text-body font-semibold text-[color:var(--color-black)]">
                Дякуємо! Ми зв&apos;яжемося з вами найближчим часом.
              </p>
              <button type="button" onClick={onClose} className="btn-primary mt-5">
                Закрити
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <p className="text-caption text-subtitle">
                Залиште контакти — менеджер передзвонить і допоможе підібрати
                круїз або тур.
              </p>

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
                  placeholder="Напрямок, дати, кількість людей, бюджет..."
                />
              </Field>

              <input
                id={honeypotId}
                type="text"
                name="_hp"
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
