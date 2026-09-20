"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
  phone: "",
  details: "",
};

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setError("");
    setSuccess(false);
  }, [open]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
            <form className="space-y-3" onSubmit={handleSubmit}>
              <p className="text-caption text-subtitle">
                Залиште контакти — менеджер передзвонить.
              </p>

              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="field-control h-12 w-full bg-white px-4 text-body text-[color:var(--color-black)]"
                placeholder="Ім'я"
              />

              <input
                type="tel"
                required
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="field-control h-12 w-full bg-white px-4 text-body text-[color:var(--color-black)]"
                placeholder="Телефон"
              />

              <textarea
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
                rows={3}
                className="field-control w-full resize-none bg-white px-4 py-3 text-body text-[color:var(--color-black)]"
                placeholder="Коментар: напрямок, дати, кількість людей, бюджет..."
              />

              {error ? (
                <p className="text-caption text-red-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary btn-primary--block mt-1"
              >
                {submitting ? "Надсилання..." : "Надіслати"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
