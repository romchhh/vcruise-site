"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field } from "@/components/admin/AdminForm";
import {
  AdminCard,
  AdminPageHeader,
  PrimaryButton,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import type { SiteSettings } from "@/lib/cms/store";

type TabKey = "general" | "contacts" | "seo" | "integrations" | "chat";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "general", label: "Загальні" },
  { key: "contacts", label: "Контакти" },
  { key: "seo", label: "SEO" },
  { key: "chat", label: "Чат" },
  { key: "integrations", label: "Інтеграції" },
];

type TextKey = {
  [K in keyof SiteSettings]: SiteSettings[K] extends string ? K : never;
}[keyof SiteSettings];

export default function SettingsView() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<TabKey>("general");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch<{ ok: boolean; settings: SiteSettings }>("/api/admin/settings")
      .then((data) => {
        if (!cancelled) setSettings(data.settings);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Не вдалося завантажити налаштування",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setMessage(null);
  }

  function text(key: TextKey, label: string, type = "text", placeholder = "") {
    if (!settings) return null;
    return (
      <Field label={label}>
        <input
          type={type}
          value={settings[key]}
          placeholder={placeholder}
          onChange={(event) => set(key, event.target.value)}
        />
      </Field>
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await adminFetch<{ ok: boolean; settings: SiteSettings }>(
        "/api/admin/settings",
        { method: "PUT", body: JSON.stringify(settings) },
      );
      setSettings(data.settings);
      setMessage({ type: "ok", text: "Налаштування збережено." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Не вдалося зберегти",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <div className={ui.empty}>{loadError}</div>;
  if (!settings) return <div className={ui.loading}>Завантаження…</div>;

  return (
    <>
      <AdminPageHeader
        title="Налаштування"
        description="Загальні дані компанії, контакти, SEO та інтеграції сайту."
      />

      <div className={ui.filters} data-tour="tour-settings-tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${ui.filterChip} ${tab === item.key ? ui.filterChipActive : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={save}>
        <AdminCard>
          <div className={ui.modalBody}>
            {tab === "general" ? (
              <div className={ui.formGrid}>
                {text("brandName", "Назва бренду")}
                {text("legalName", "Юридична назва")}
                {text("domain", "Домен", "text", "vcruise.com.ua")}
              </div>
            ) : null}

            {tab === "contacts" ? (
              <>
                <div className={ui.formGrid}>
                  {text("email", "Email", "email")}
                  {text("phone", "Телефон (для посилань)", "tel", "+380…")}
                  {text("phoneDisplay", "Телефон (відображення)")}
                  {text("city", "Місто")}
                </div>
                {text("address", "Адреса")}
                <div className={ui.formGrid}>
                  {text("socialInstagram", "Instagram", "url")}
                  {text("socialFacebook", "Facebook", "url")}
                  {text("socialTelegram", "Telegram (посилання)", "url")}
                  {text("socialViber", "Viber (посилання)")}
                </div>
              </>
            ) : null}

            {tab === "seo" ? (
              <>
                {text("metaTitle", "Meta title")}
                <Field label="Meta description">
                  <textarea
                    value={settings.metaDescription}
                    onChange={(event) =>
                      set("metaDescription", event.target.value)
                    }
                  />
                </Field>
                <p className={ui.tableHint}>
                  Рекомендовано: title до 60 символів, description до 160.
                  Зараз: {settings.metaTitle.length} / {settings.metaDescription.length}.
                </p>
              </>
            ) : null}

            {tab === "chat" ? (
              <>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.chatEnabled !== false}
                    onChange={(event) =>
                      set("chatEnabled", event.target.checked)
                    }
                  />
                  Показати віджет онлайн-чату на сайті
                </label>
                {text("chatAgentName", "Ім'я агента в чаті")}
                {text(
                  "chatAgentImage",
                  "Фото асистента (URL)",
                  "text",
                  "/images/chat-assistant.jpg"
                )}
                <Field label="Привітальне повідомлення">
                  <textarea
                    value={settings.chatWelcomeMessage || ""}
                    onChange={(event) =>
                      set("chatWelcomeMessage", event.target.value)
                    }
                  />
                </Field>
                <Field label="Повідомлення, коли чат вимкнено / офлайн">
                  <textarea
                    value={settings.chatOfflineMessage || ""}
                    onChange={(event) =>
                      set("chatOfflineMessage", event.target.value)
                    }
                  />
                </Field>
                <p className={ui.tableHint}>
                  Заготовки швидких питань і відповідей редагуються в розділі
                  «Чат → Заготовки».
                </p>
              </>
            ) : null}

            {tab === "integrations" ? (
              <>
                {text("telegramUsername", "Telegram username", "text", "vcruise")}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.telegramNotify}
                    onChange={(event) =>
                      set("telegramNotify", event.target.checked)
                    }
                  />
                  Сповіщати в Telegram про нові заявки
                </label>
              </>
            ) : null}

            {message ? (
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color:
                    message.type === "ok" ? "var(--admin-green)" : "#b91c1c",
                }}
              >
                {message.text}
              </p>
            ) : null}

            <div className={ui.formActions}>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Збереження…" : "Зберегти"}
              </PrimaryButton>
            </div>
          </div>
        </AdminCard>
      </form>
    </>
  );
}
