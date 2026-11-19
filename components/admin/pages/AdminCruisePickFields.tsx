"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field } from "@/components/admin/AdminForm";
import ui from "@/components/admin/AdminUi.module.css";
import ImageDropField from "@/components/admin/ImageDropField";
import {
  parseSiteCruiseKey,
  type CruisePickOption,
  type CruisePickSailing,
} from "@/lib/cms/section-card-shared";
import type { ContentBlockCard } from "@/lib/cms/store";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asCruiseKey(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }
  return "";
}

function sailingLabel(sailing: CruisePickSailing) {
  const nights =
    sailing.nights === 1 ? "1 ніч" : `${sailing.nights} ночей`;
  return `${nights} · ${sailing.routePreview}`;
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
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteHint, setPasteHint] = useState("");

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
  const cruiseKey = asCruiseKey(card.cruiseKey);

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

  const activeOption = useMemo(
    () =>
      options.find(
        (item) => item.company === company && item.linerSlug === liner,
      ),
    [options, company, liner],
  );

  const dates = activeOption?.dates ?? [];
  const sailingsForDate = useMemo(() => {
    if (!activeOption || !date) return [] as CruisePickSailing[];
    return activeOption.sailings.filter((item) => item.date === date);
  }, [activeOption, date]);

  const applySailing = (sailing: CruisePickSailing, option: CruisePickOption) => {
    onChange({
      company: option.company,
      liner: option.linerSlug,
      date: sailing.date,
      cruiseKey: String(sailing.key),
    });
  };

  const applyPaste = () => {
    const key = parseSiteCruiseKey(pasteUrl);
    if (!key) {
      setPasteHint(
        "Не розпізнано. Вставте посилання виду /search/cruise/12345 або ?cruise=12345",
      );
      return;
    }

    for (const option of options) {
      const sailing = option.sailings.find((item) => item.key === key);
      if (!sailing) continue;
      applySailing(sailing, option);
      setPasteHint(
        `Додано: ${option.company} · ${option.linerName} · ${sailing.date} · ${sailingLabel(sailing)}`,
      );
      setPasteUrl("");
      return;
    }

    setPasteHint(
      `Ключ ${key} не знайдено в каталозі (можливо, круїз уже знятий з продажу).`,
    );
  };

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
        Оберіть компанію, лайнер і дату — або вставте посилання з сайту на
        конкретний круїз (коли на одну дату кілька маршрутів різної довжини).
        Ціна й маршрут підтягнуться з бази.
        {blockKey === "hot-deals"
          ? " Бейджі «Гаряча пропозиція» і знижка залишаються. Фото можна замінити нижче (drag & drop)."
          : " Два фото на картці: обкладинка (завжди видно) і лайнер (при наведенні)."}
      </p>

      <Field label="Посилання з сайту (опційно)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ flex: "1 1 220px" }}
            value={pasteUrl}
            placeholder="https://vcruise.com.ua/search/cruise/4175"
            onChange={(event) => {
              setPasteUrl(event.target.value);
              if (pasteHint) setPasteHint("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyPaste();
              }
            }}
          />
          <button type="button" className={ui.ghostBtn} onClick={applyPaste}>
            Підставити
          </button>
        </div>
        {pasteHint ? (
          <p className={ui.tableHint} style={{ marginTop: 8 }}>
            {pasteHint}
          </p>
        ) : (
          <p className={ui.tableHint} style={{ marginTop: 8 }}>
            Знайдіть круїз на сайті → скопіюйте URL → вставте сюди. Підтягнеться
            саме цей рейс (компанія, лайнер, дата, варіант маршруту).
          </p>
        )}
      </Field>

      <div className={ui.formGrid}>
        <Field label="Круїзна компанія">
          <select
            value={company}
            onChange={(event) =>
              onChange({
                company: event.target.value,
                liner: "",
                date: "",
                cruiseKey: "",
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
                cruiseKey: "",
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
            onChange={(event) => {
              const nextDate = event.target.value;
              const forDate =
                activeOption?.sailings.filter(
                  (item) => item.date === nextDate,
                ) ?? [];
              onChange({
                date: nextDate,
                cruiseKey:
                  forDate.length === 1 ? String(forDate[0]!.key) : "",
              });
            }}
          >
            <option value="">Оберіть дату</option>
            {dates.map((value) => {
              const count =
                activeOption?.sailings.filter((item) => item.date === value)
                  .length ?? 0;
              return (
                <option key={value} value={value}>
                  {count > 1 ? `${value} (${count} маршрути)` : value}
                </option>
              );
            })}
          </select>
        </Field>

        {sailingsForDate.length > 1 ? (
          <Field label="Варіант маршруту">
            <select
              value={cruiseKey}
              onChange={(event) =>
                onChange({ cruiseKey: event.target.value })
              }
            >
              <option value="">Оберіть тривалість / маршрут</option>
              {sailingsForDate.map((sailing) => (
                <option key={sailing.key} value={String(sailing.key)}>
                  {sailingLabel(sailing)}
                </option>
              ))}
            </select>
          </Field>
        ) : sailingsForDate.length === 1 ? (
          <Field label="Маршрут">
            <input
              value={sailingLabel(sailingsForDate[0]!)}
              readOnly
              disabled
            />
          </Field>
        ) : null}

        <Field
          label={
            blockKey === "unique-routes"
              ? "Заголовок на картці"
              : "Заголовок на картці (опційно)"
          }
        >
          <input
            value={asString(card.title)}
            placeholder={
              blockKey === "unique-routes"
                ? "Порожнє = порти маршруту (напр. Гонконг — Корон)"
                : "Порожнє = «Класичний круїз: …» з портів"
            }
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </Field>

        <Field label="Ціна показується як">
          <select
            value={
              asString(card.priceBasis) === "couple" ? "couple" : "person"
            }
            onChange={(event) =>
              onChange({
                priceBasis:
                  event.target.value === "couple" ? "couple" : "person",
              })
            }
          >
            <option value="person">За особу</option>
            <option value="couple">За двох</option>
          </select>
        </Field>

        {blockKey === "hot-deals" ? (
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
        ) : null}
      </div>

      {cruiseKey ? (
        <p className={ui.tableHint}>
          Привʼязано до круїзу #{cruiseKey}
          {sailingsForDate.length <= 1 && date
            ? ` · ${date}`
            : sailingsForDate.find((item) => String(item.key) === cruiseKey)
              ? ` · ${sailingLabel(
                  sailingsForDate.find(
                    (item) => String(item.key) === cruiseKey,
                  )!,
                )}`
              : ""}
        </p>
      ) : null}

      {blockKey === "hot-deals" ? (
        <Field label="Фото картки (опційно; порожнє = фото лайнера з бази)">
          <ImageDropField
            value={asString(card.image)}
            onChange={(image) => onChange({ image })}
            emptyLabel="Перетягніть фото картки або натисніть, щоб обрати"
            hint="Порожнє = фото лайнера з бази · JPG / PNG / WEBP до 8 МБ"
          />
        </Field>
      ) : (
        <div className={ui.formGrid}>
          <Field label="Фото обкладинки (перше на картці)">
            <ImageDropField
              value={asString(card.coverImage)}
              onChange={(coverImage) => onChange({ coverImage })}
              emptyLabel="Перетягніть обкладинку сюди або натисніть, щоб обрати"
              hint="Це фото видно одразу · JPG / PNG / WEBP до 8 МБ"
            />
          </Field>
          <Field label="Фото лайнера (при наведенні, опційно)">
            <ImageDropField
              value={asString(card.linerImage)}
              onChange={(linerImage) => onChange({ linerImage })}
              emptyLabel="Перетягніть фото лайнера або натисніть, щоб обрати"
              hint="Порожнє = фото лайнера з бази · показується при hover"
            />
          </Field>
        </div>
      )}
    </>
  );
}
