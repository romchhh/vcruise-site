"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field } from "@/components/admin/AdminForm";
import ui from "@/components/admin/AdminUi.module.css";
import type { CruisePickOption } from "@/lib/cms/section-card-shared";
import type { ContentBlockCard } from "@/lib/cms/store";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

type Props = {
  blockKey: "hot-deals" | "unique-routes";
  card: ContentBlockCard;
  onChange: (patch: Record<string, unknown>) => void;
};

export default function AdminCruisePickFields({
  blockKey,
  card,
  onChange,
}: Props) {
  const [options, setOptions] = useState<CruisePickOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await adminFetch<{
          ok: boolean;
          options: CruisePickOption[];
        }>("/api/admin/content/cruises");
        if (!cancelled) setOptions(data.options || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося завантажити круїзи",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const company = asString(card.company);
  const liner = asString(card.liner);
  const date = asString(card.date);

  const companies = useMemo(
    () =>
      Array.from(new Set(options.map((item) => item.company))).sort((a, b) =>
        a.localeCompare(b, "uk"),
      ),
    [options],
  );

  const liners = useMemo(
    () =>
      options
        .filter((item) => !company || item.company === company)
        .map((item) => ({
          slug: item.linerSlug,
          name: item.linerName,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "uk")),
    [options, company],
  );

  const dates = useMemo(() => {
    const match = options.find(
      (item) => item.company === company && item.linerSlug === liner,
    );
    return match?.dates ?? [];
  }, [options, company, liner]);

  if (loading) {
    return <p className={ui.tableHint}>Завантаження круїзів…</p>;
  }

  if (error) {
    return (
      <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13 }}>{error}</p>
    );
  }

  return (
    <>
      <p className={ui.tableHint}>
        Оберіть компанію, лайнер і дату — ціна та маршрут підтягнуться з бази
        автоматично.
        {blockKey === "hot-deals"
          ? " Бейджі «Гаряча пропозиція» і знижка залишаються. Фото лайнера підтягується з бази автоматично."
          : " Друге фото (лайнер) береться з бази; можете додати своє фото обкладинки."}
      </p>

      <div className={ui.formGrid}>
        <Field label="Круїзна компанія">
          <select
            value={company}
            onChange={(event) =>
              onChange({
                company: event.target.value,
                liner: "",
                date: "",
              })
            }
          >
            <option value="">Оберіть компанію</option>
            {companies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Лайнер">
          <select
            value={liner}
            disabled={!company}
            onChange={(event) =>
              onChange({
                liner: event.target.value,
                date: "",
              })
            }
          >
            <option value="">Оберіть лайнер</option>
            {liners.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Дата виходу">
          <select
            value={date}
            disabled={!liner}
            onChange={(event) => onChange({ date: event.target.value })}
          >
            <option value="">Оберіть дату</option>
            {dates.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        {blockKey === "hot-deals" ? (
          <>
            <Field label="Знижка на бейджі (%)">
              <input
                type="number"
                min={1}
                max={90}
                value={asNumber(card.discountPercent, 25)}
                onChange={(event) =>
                  onChange({
                    discountPercent: Number(event.target.value) || 25,
                  })
                }
              />
            </Field>
            <Field label="Фото картки (опційно; порожнє = фото лайнера з бази)">
              <input
                value={asString(card.image)}
                placeholder="Залишити порожнім = фото лайнера"
                onChange={(event) => onChange({ image: event.target.value })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Фото обкладинки (1 фото)">
              <input
                value={asString(card.coverImage)}
                placeholder="/images/sections/unique-routes-cover.jpg"
                onChange={(event) =>
                  onChange({ coverImage: event.target.value })
                }
              />
            </Field>
            <Field label="Фото лайнера (hover, опційно)">
              <input
                value={asString(card.linerImage)}
                placeholder="Залишити порожнім = з бази круїзів"
                onChange={(event) =>
                  onChange({ linerImage: event.target.value })
                }
              />
            </Field>
          </>
        )}
      </div>
    </>
  );
}
