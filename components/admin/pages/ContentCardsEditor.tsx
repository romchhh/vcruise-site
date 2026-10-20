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
      onChange(data.items || []);
      setOpenId(data.items?.[0]?.id ?? null);
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
          Картки секції · {items.length}
        </h4>
        <p className={styles.sectionHint}>
          {cruiseDriven
            ? "Якщо список порожній — на сайті показуються автоматичні круїзи з бази"
            : "Ці картки показуються на головній у цій секції"}
        </p>
      </div>

      <div className={styles.imageActions}>
        <GhostButton disabled={suggesting} onClick={() => void pullFromSource()}>
          {suggesting
            ? "Завантаження…"
            : cruiseDriven
              ? "Підтягнути з бази круїзів"
              : "Скинути до стандартних"}
        </GhostButton>
        <PrimaryButton onClick={addCard}>Додати картку</PrimaryButton>
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
                      <>
                        <div className={ui.formGrid}>
                          <Field label="Заголовок картки">
                            <input
                              value={asString(card.title)}
                              onChange={(event) =>
                                updateCard(index, {
                                  title: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Маршрут">
                            <input
                              value={asString(card.route)}
                              onChange={(event) =>
                                updateCard(index, {
                                  route: event.target.value,
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
                          <Field label="Ціна ($)">
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
                          {blockKey === "hot-deals" ? (
                            <>
                              <Field label="Стара ціна ($)">
                                <input
                                  type="number"
                                  value={asNumber(card.originalPrice)}
                                  onChange={(event) =>
                                    updateCard(index, {
                                      originalPrice:
                                        Number(event.target.value) || 0,
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Знижка (%)">
                                <input
                                  type="number"
                                  value={asNumber(card.discountPercent)}
                                  onChange={(event) =>
                                    updateCard(index, {
                                      discountPercent:
                                        Number(event.target.value) || 0,
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Зображення (URL)">
                                <input
                                  value={asString(card.image)}
                                  onChange={(event) =>
                                    updateCard(index, {
                                      image: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                            </>
                          ) : (
                            <>
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
                              <Field label="Компанія / лінія">
                                <input
                                  value={asString(card.line)}
                                  onChange={(event) =>
                                    updateCard(index, {
                                      line: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Обкладинка (URL)">
                                <input
                                  value={asString(card.coverImage)}
                                  onChange={(event) =>
                                    updateCard(index, {
                                      coverImage: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Фото лайнера (hover)">
                                <input
                                  value={asString(card.linerImage)}
                                  onChange={(event) =>
                                    updateCard(index, {
                                      linerImage: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                            </>
                          )}
                          <Field label="Посилання">
                            <input
                              value={asString(card.href)}
                              onChange={(event) =>
                                updateCard(index, {
                                  href: event.target.value,
                                })
                              }
                            />
                          </Field>
                        </div>
                      </>
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
                          <Field label="Обкладинка (URL)">
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
                          <Field label="Місто">
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
                          <Field label="Гості">
                            <input
                              value={asString(card.guests)}
                              onChange={(event) =>
                                updateCard(index, {
                                  guests: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Ліжко">
                            <input
                              value={asString(card.bed)}
                              onChange={(event) =>
                                updateCard(index, {
                                  bed: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Рейтинг зірок">
                            <input
                              type="number"
                              value={asNumber(card.rating)}
                              onChange={(event) =>
                                updateCard(index, {
                                  rating: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </Field>
                          <Field label="Оцінка відгуків">
                            <input
                              type="number"
                              step="0.1"
                              value={asNumber(card.reviewScore)}
                              onChange={(event) =>
                                updateCard(index, {
                                  reviewScore: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </Field>
                          <Field label="К-сть відгуків">
                            <input
                              type="number"
                              value={asNumber(card.reviewCount)}
                              onChange={(event) =>
                                updateCard(index, {
                                  reviewCount: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </Field>
                          <Field label="Мітка відгуку">
                            <input
                              value={asString(card.reviewLabel)}
                              onChange={(event) =>
                                updateCard(index, {
                                  reviewLabel: event.target.value,
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
                        <Field label="Опис">
                          <textarea
                            value={asString(card.about)}
                            onChange={(event) =>
                              updateCard(index, {
                                about: event.target.value,
                              })
                            }
                          />
                        </Field>
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
