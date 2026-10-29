"use client";

import { useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field } from "@/components/admin/AdminForm";
import {
  DangerButton,
  GhostButton,
  PrimaryButton,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import ImageGalleryField from "@/components/admin/ImageGalleryField";
import AdminCruisePickFields from "@/components/admin/pages/AdminCruisePickFields";
import { SECTION_CARD_LIMIT } from "@/lib/cms/section-card-shared";
import {
  emptyCardFor,
  isCardSection,
} from "@/lib/cms/section-items";
import type { ContentBlockCard, ContentBlockKey } from "@/lib/cms/store";
import styles from "./ContentView.module.css";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asLines(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join("\n");
  }
  return asString(value);
}

function fromLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cardTitle(card: ContentBlockCard, key: ContentBlockKey) {
  if (key === "hot-deals" || key === "unique-routes") {
    const company = asString(card.company);
    const date = asString(card.date);
    if (company && date) return `${company} · ${date}`;
    if (company) return company;
    return "Оберіть круїз";
  }
  if (key === "package-tours") {
    return asString(card.hotel) || asString(card.title) || "Тур";
  }
  return asString(card.title) || "Картка";
}

function cardThumb(card: ContentBlockCard) {
  return (
    asString(card.image) ||
    asString(card.coverImage) ||
    (Array.isArray(card.gallery) && typeof card.gallery[0] === "string"
      ? card.gallery[0]
      : "") ||
    (Array.isArray(card.images) && typeof card.images[0] === "string"
      ? card.images[0]
      : "")
  );
}

type Props = {
  blockKey: ContentBlockKey;
  items: ContentBlockCard[];
  onChange: (items: ContentBlockCard[]) => void;
};

export default function ContentCardsEditor({
  blockKey,
  items,
  onChange,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

  if (!isCardSection(blockKey)) return null;

  const cruiseDriven =
    blockKey === "hot-deals" || blockKey === "unique-routes";

  function updateCard(index: number, patch: Record<string, unknown>) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeCard(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    if (openId && !next.some((item) => item.id === openId)) {
      setOpenId(next[0]?.id ?? null);
    }
  }

  function addCard() {
    if (items.length >= SECTION_CARD_LIMIT) return;
    const card = emptyCardFor(blockKey);
    onChange([...items, card]);
    setOpenId(card.id);
  }

  function moveCard(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  async function pullFromSource() {
    setSuggesting(true);
    setError("");
    try {
      const data = await adminFetch<{ ok: boolean; items: ContentBlockCard[] }>(
        `/api/admin/content/suggest?key=${encodeURIComponent(blockKey)}`,
      );
      const next = (data.items || []).slice(0, SECTION_CARD_LIMIT);
      onChange(next);
      setOpenId(next[0]?.id ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося підтягнути картки",
      );
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h4 className={styles.sectionTitle}>
          Картки секції · {items.length}/{SECTION_CARD_LIMIT}
        </h4>
        <p className={styles.sectionHint}>
          {cruiseDriven
            ? "До 6 вікон. Порожній список = автопідбір з бази на сайті"
            : "До 6 карток. Ці блоки показуються на головній у цій секції"}
        </p>
      </div>

      <div className={styles.imageActions}>
        <GhostButton disabled={suggesting} onClick={() => void pullFromSource()}>
          {suggesting
            ? "Завантаження…"
            : cruiseDriven
              ? "Підтягнути 6 з бази"
              : "Скинути до стандартних"}
        </GhostButton>
        <PrimaryButton
          onClick={addCard}
          disabled={items.length >= SECTION_CARD_LIMIT}
        >
          Додати вікно
        </PrimaryButton>
        {cruiseDriven && items.length > 0 ? (
          <GhostButton
            onClick={() => {
              onChange([]);
              setOpenId(null);
            }}
          >
            Очистити (авто з бази)
          </GhostButton>
        ) : null}
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className={styles.sectionHint}>
          {cruiseDriven
            ? "Картки не зафіксовані — сайт покаже актуальний автопідбір."
            : "Немає карток. Додайте або підтягніть стандартні."}
        </p>
      ) : (
        <div className={styles.cardsList}>
          {items.map((card, index) => {
            const open = openId === card.id;
            const thumb = cardThumb(card);
            return (
              <div key={card.id} className={styles.featureCard}>
                <button
                  type="button"
                  className={styles.cardToggle}
                  onClick={() => setOpenId(open ? null : card.id)}
                >
                  <span className={styles.cardToggleMedia}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" />
                    ) : (
                      <span>№{index + 1}</span>
                    )}
                  </span>
                  <span className={styles.cardToggleMeta}>
                    <strong>{cardTitle(card, blockKey)}</strong>
                    <span>
                      {asString(card.route) ||
                        asString(card.subtitle) ||
                        asString(card.city) ||
                        asString(card.region) ||
                        "Натисніть, щоб редагувати"}
                    </span>
                  </span>
                  <span className={styles.cardToggleChevron}>
                    {open ? "▾" : "▸"}
                  </span>
                </button>

                {open ? (
                  <div className={styles.cardEditor}>
                    <div className={styles.imageActions}>
                      <GhostButton
                        disabled={index === 0}
                        onClick={() => moveCard(index, -1)}
                      >
                        ↑ Вище
                      </GhostButton>
                      <GhostButton
                        disabled={index === items.length - 1}
                        onClick={() => moveCard(index, 1)}
                      >
                        ↓ Нижче
                      </GhostButton>
                      <DangerButton onClick={() => removeCard(index)}>
                        Видалити
                      </DangerButton>
                    </div>

                    {(blockKey === "hot-deals" ||
                      blockKey === "unique-routes") && (
                      <AdminCruisePickFields
                        blockKey={blockKey}
                        card={card}
                        onChange={(patch) => updateCard(index, patch)}
                      />
                    )}

                    {blockKey === "destinations" && (
                      <>
                        <div className={ui.formGrid}>
                          <Field label="Назва">
                            <input
                              value={asString(card.title)}
                              onChange={(event) =>
                                updateCard(index, {
                                  title: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Підзаголовок">
                            <input
                              value={asString(card.subtitle)}
                              onChange={(event) =>
                                updateCard(index, {
                                  subtitle: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Сезонність">
                            <input
                              value={asString(card.seasonality)}
                              onChange={(event) =>
                                updateCard(index, {
                                  seasonality: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Температура">
                            <input
                              value={asString(card.temperature)}
                              onChange={(event) =>
                                updateCard(index, {
                                  temperature: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Мітка для пошуку">
                            <input
                              value={asString(card.searchLabel)}
                              onChange={(event) =>
                                updateCard(index, {
                                  searchLabel: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Головне фото (URL)">
                            <input
                              value={asString(card.image)}
                              onChange={(event) =>
                                updateCard(index, {
                                  image: event.target.value,
                                })
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Короткий опис">
                          <textarea
                            value={asString(card.description)}
                            onChange={(event) =>
                              updateCard(index, {
                                description: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Детальний опис (абзаци через порожній рядок)">
                          <textarea
                            style={{ minHeight: 140 }}
                            value={
                              Array.isArray(card.about)
                                ? card.about
                                    .filter(
                                      (item): item is string =>
                                        typeof item === "string",
                                    )
                                    .join("\n\n")
                                : asString(card.about)
                            }
                            onChange={(event) =>
                              updateCard(index, {
                                about: event.target.value
                                  .split(/\n\s*\n/)
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </Field>
                        <div>
                          <span className={ui.detailLabel}>Галерея</span>
                          <ImageGalleryField
                            images={
                              Array.isArray(card.gallery)
                                ? card.gallery.filter(
                                    (item): item is string =>
                                      typeof item === "string",
                                  )
                                : []
                            }
                            onChange={(gallery) =>
                              updateCard(index, { gallery })
                            }
                          />
                        </div>
                      </>
                    )}

                    {blockKey === "liner-classes" && (
                      <>
                        <div className={ui.formGrid}>
                          <Field label="Назва класу">
                            <input
                              value={asString(card.title)}
                              onChange={(event) =>
                                updateCard(index, {
                                  title: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <div>
                            <span className={ui.detailLabel}>
                              Обкладинка класу (завантаження або URL)
                            </span>
                            <ImageGalleryField
                              images={
                                asString(card.image)
                                  ? [asString(card.image)]
                                  : []
                              }
                              onChange={(images) =>
                                updateCard(index, {
                                  image: images[0] || "",
                                })
                              }
                            />
                          </div>
                        </div>
                        <Field label="Заголовок у модалці">
                          <input
                            value={asString(card.modalHeadline)}
                            onChange={(event) =>
                              updateCard(index, {
                                modalHeadline: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Опис у модалці (абзаци через порожній рядок)">
                          <textarea
                            style={{ minHeight: 140 }}
                            value={
                              Array.isArray(card.modalDescription)
                                ? card.modalDescription
                                    .filter(
                                      (item): item is string =>
                                        typeof item === "string",
                                    )
                                    .join("\n\n")
                                : ""
                            }
                            onChange={(event) =>
                              updateCard(index, {
                                modalDescription: event.target.value
                                  .split(/\n\s*\n/)
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </Field>
                        <Field label="Популярні лайнери (по одному в рядку)">
                          <textarea
                            value={asLines(card.popularLiners)}
                            onChange={(event) =>
                              updateCard(index, {
                                popularLiners: fromLines(event.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Кораблі (формат: Назва | slug | компанія)">
                          <textarea
                            style={{ minHeight: 120 }}
                            value={
                              Array.isArray(card.ships)
                                ? card.ships
                                    .map((ship) => {
                                      if (!ship || typeof ship !== "object")
                                        return "";
                                      const entry = ship as Record<
                                        string,
                                        unknown
                                      >;
                                      return [
                                        asString(entry.name),
                                        asString(entry.linerSlug),
                                        asString(entry.company),
                                      ]
                                        .filter(Boolean)
                                        .join(" | ");
                                    })
                                    .filter(Boolean)
                                    .join("\n")
                                : ""
                            }
                            onChange={(event) =>
                              updateCard(index, {
                                ships: fromLines(event.target.value).map(
                                  (line) => {
                                    const [name, linerSlug, company] = line
                                      .split("|")
                                      .map((part) => part.trim());
                                    return {
                                      name,
                                      ...(linerSlug ? { linerSlug } : {}),
                                      ...(company ? { company } : {}),
                                    };
                                  },
                                ),
                              })
                            }
                          />
                        </Field>
                        <Field label="Логотипи (формат: URL | alt)">
                          <textarea
                            value={
                              Array.isArray(card.logos)
                                ? card.logos
                                    .map((logo) => {
                                      if (!logo || typeof logo !== "object")
                                        return "";
                                      const entry = logo as Record<
                                        string,
                                        unknown
                                      >;
                                      return [
                                        asString(entry.src),
                                        asString(entry.alt),
                                      ]
                                        .filter(Boolean)
                                        .join(" | ");
                                    })
                                    .filter(Boolean)
                                    .join("\n")
                                : ""
                            }
                            onChange={(event) =>
                              updateCard(index, {
                                logos: fromLines(event.target.value).map(
                                  (line) => {
                                    const [src, alt = ""] = line
                                      .split("|")
                                      .map((part) => part.trim());
                                    return { src, alt };
                                  },
                                ),
                              })
                            }
                          />
                        </Field>
                        <div>
                          <span className={ui.detailLabel}>Галерея</span>
                          <ImageGalleryField
                            images={
                              Array.isArray(card.gallery)
                                ? card.gallery.filter(
                                    (item): item is string =>
                                      typeof item === "string",
                                  )
                                : []
                            }
                            onChange={(gallery) =>
                              updateCard(index, { gallery })
                            }
                          />
                        </div>
                      </>
                    )}

                    {blockKey === "package-tours" && (
                      <>
                        <p className={ui.tableHint}>
                          Пакетний тур: маршрут/готель, опис (маршрут, пересадки,
                          готель) і 3–5 фото.
                        </p>
                        <div className={ui.formGrid}>
                          <Field label="Готель">
                            <input
                              value={asString(card.hotel)}
                              onChange={(event) =>
                                updateCard(index, {
                                  hotel: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Місто / маршрут">
                            <input
                              value={asString(card.city)}
                              onChange={(event) =>
                                updateCard(index, {
                                  city: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Регіон">
                            <input
                              value={asString(card.region)}
                              onChange={(event) =>
                                updateCard(index, {
                                  region: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Дати">
                            <input
                              value={asString(card.dateRange)}
                              onChange={(event) =>
                                updateCard(index, {
                                  dateRange: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Ночі">
                            <input
                              type="number"
                              value={asNumber(card.nights)}
                              onChange={(event) =>
                                updateCard(index, {
                                  nights: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </Field>
                          <Field label="Ціна">
                            <input
                              type="number"
                              value={asNumber(card.price)}
                              onChange={(event) =>
                                updateCard(index, {
                                  price: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </Field>
                          <Field label="Харчування">
                            <input
                              value={asString(card.meals)}
                              onChange={(event) =>
                                updateCard(index, {
                                  meals: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Номер">
                            <input
                              value={asString(card.room)}
                              onChange={(event) =>
                                updateCard(index, {
                                  room: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Головне фото (URL)">
                            <input
                              value={asString(card.image)}
                              onChange={(event) =>
                                updateCard(index, {
                                  image: event.target.value,
                                })
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Опис (маршрут, пересадки, готель)">
                          <textarea
                            style={{ minHeight: 140 }}
                            value={asString(card.about)}
                            onChange={(event) =>
                              updateCard(index, {
                                about: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <div>
                          <span className={ui.detailLabel}>
                            Фото 3–5 (готель, маршрут…)
                          </span>
                          <ImageGalleryField
                            images={
                              Array.isArray(card.gallery)
                                ? card.gallery.filter(
                                    (item): item is string =>
                                      typeof item === "string",
                                  )
                                : []
                            }
                            onChange={(gallery) =>
                              updateCard(index, {
                                gallery: gallery.slice(0, 5),
                                image: gallery[0] || asString(card.image),
                              })
                            }
                          />
                        </div>
                        <Field label="Зручності (по одному в рядку)">
                          <textarea
                            value={asLines(card.amenities)}
                            onChange={(event) =>
                              updateCard(index, {
                                amenities: fromLines(event.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Що включено (по одному в рядку)">
                          <textarea
                            value={asLines(card.included)}
                            onChange={(event) =>
                              updateCard(index, {
                                included: fromLines(event.target.value),
                              })
                            }
                          />
                        </Field>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
