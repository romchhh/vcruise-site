"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field, Modal } from "@/components/admin/AdminForm";
import {
  AdminPageHeader,
  DangerButton,
  GhostButton,
  PrimaryButton,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import ImageGalleryField from "@/components/admin/ImageGalleryField";
import ContentCardsEditor from "@/components/admin/pages/ContentCardsEditor";
import { isCardSection } from "@/lib/cms/section-items";
import type {
  ContentBlock,
  ContentBlockFeature,
  ContentBlockKey,
} from "@/lib/cms/store";
import styles from "./ContentView.module.css";

const errorStyle = { color: "#b91c1c", fontWeight: 700, fontSize: 13 } as const;

type BlockFields = {
  badge: boolean;
  title: boolean;
  titleLine2: boolean;
  description: boolean;
  paragraphs: boolean;
  image: boolean;
  imageAlt: boolean;
  gallery: boolean;
  cta: boolean;
  features: boolean;
};

function fieldsFor(key: ContentBlockKey): BlockFields {
  switch (key) {
    case "hero":
      return {
        badge: false,
        title: true,
        titleLine2: true,
        description: true,
        paragraphs: false,
        image: true,
        imageAlt: true,
        gallery: false,
        cta: false,
        features: false,
      };
    case "about":
      return {
        badge: true,
        title: true,
        titleLine2: false,
        description: false,
        paragraphs: true,
        image: true,
        imageAlt: true,
        gallery: false,
        cta: false,
        features: true,
      };
    case "cta":
      return {
        badge: true,
        title: true,
        titleLine2: false,
        description: true,
        paragraphs: false,
        image: false,
        imageAlt: false,
        gallery: true,
        cta: true,
        features: false,
      };
    case "cruise-finder":
      return {
        badge: true,
        title: true,
        titleLine2: true,
        description: true,
        paragraphs: false,
        image: true,
        imageAlt: true,
        gallery: false,
        cta: true,
        features: false,
      };
    default:
      return {
        badge: true,
        title: true,
        titleLine2: false,
        description: true,
        paragraphs: false,
        image: false,
        imageAlt: false,
        gallery: false,
        cta: false,
        features: false,
      };
  }
}

function coverSrc(block: ContentBlock) {
  return block.image || block.images[0] || "";
}

function previewLead(block: ContentBlock) {
  if (block.description?.trim()) return block.description.trim();
  if (block.paragraphs?.length) return block.paragraphs.join(" ");
  return "";
}

function normalizeBlock(block: ContentBlock): ContentBlock {
  return {
    ...block,
    paragraphs: Array.isArray(block.paragraphs) ? block.paragraphs : [],
    images: Array.isArray(block.images) ? block.images : [],
    features: Array.isArray(block.features) ? block.features : [],
    items: Array.isArray(block.items) ? block.items : [],
  };
}

function EditGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5 16.5 11.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ContentView() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ContentBlock | null>(null);
  const [paragraphsText, setParagraphsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ ok: boolean; blocks: ContentBlock[] }>(
        "/api/admin/content",
      );
      setBlocks((data.blocks || []).map(normalizeBlock));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не вдалося завантажити контент",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editingFields = useMemo(
    () => (editing ? fieldsFor(editing.key) : null),
    [editing],
  );

  async function openEditor(block: ContentBlock) {
    const next = normalizeBlock(block);
    setEditing(next);
    setParagraphsText(next.paragraphs.join("\n\n"));
    setFormError("");

    const needsSuggest =
      (next.key === "hot-deals" || next.key === "unique-routes") &&
      next.items.length === 0;
    if (!needsSuggest) return;

    try {
      const data = await adminFetch<{
        ok: boolean;
        items: ContentBlock["items"];
      }>(`/api/admin/content/suggest?key=${encodeURIComponent(next.key)}`);
      if (!data.items?.length) return;
      setEditing((current) =>
        current && current.id === next.id && current.items.length === 0
          ? { ...current, items: data.items }
          : current,
      );
    } catch {
      // Keep empty — admin can pull manually.
    }
  }

  function update<K extends keyof ContentBlock>(
    key: K,
    value: ContentBlock[K],
  ) {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateFeature(index: number, patch: Partial<ContentBlockFeature>) {
    setEditing((current) => {
      if (!current) return current;
      const features = current.features.map((feature, i) =>
        i === index ? { ...feature, ...patch } : feature,
      );
      return { ...current, features };
    });
  }

  function addFeature() {
    setEditing((current) =>
      current
        ? {
            ...current,
            features: [
              ...current.features,
              {
                id: `feature-${Date.now().toString(36)}`,
                title: "",
                description: "",
                icon: "",
              },
            ],
          }
        : current,
    );
  }

  function removeFeature(index: number) {
    setEditing((current) =>
      current
        ? {
            ...current,
            features: current.features.filter((_, i) => i !== index),
          }
        : current,
    );
  }

  async function uploadSingle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("files", file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data.error || "upload_failed");
      }
      update("image", data.url as string);
    } catch {
      setFormError(
        "Не вдалося завантажити зображення. Використовуйте JPG, PNG, WEBP до 8 МБ.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !editingFields) return;
    setSaving(true);
    setFormError("");

    const payload: ContentBlock = {
      ...editing,
      paragraphs: editingFields.paragraphs
        ? paragraphsText
            .split(/\n\s*\n/)
            .map((item) => item.trim())
            .filter(Boolean)
        : editing.paragraphs,
      features: editing.features.filter(
        (feature) => feature.title.trim() || feature.description.trim(),
      ),
    };

    try {
      const data = await adminFetch<{ ok: boolean; block: ContentBlock }>(
        "/api/admin/content",
        { method: "PUT", body: JSON.stringify(payload) },
      );
      const saved = normalizeBlock(data.block);
      setBlocks((current) =>
        current.map((block) => (block.id === saved.id ? saved : block)),
      );
      setEditing(null);
      setNotice("Блок збережено. Зміни з'являться на сайті.");
      window.setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Не вдалося зберегти блок",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Контент"
        description="Натисніть на блок, щоб редагувати всі його тексти, зображення та кнопки."
      />

      {notice ? (
        <p className={ui.tableHint} style={{ color: "var(--admin-green)" }}>
          {notice}
        </p>
      ) : null}
      {error ? <p className={ui.empty}>{error}</p> : null}

      {loading ? (
        <div className={ui.loading}>Завантаження…</div>
      ) : (
        <div className={ui.grid3} data-tour="tour-content-grid">
          {blocks.map((block) => {
            const fields = fieldsFor(block.key);
            const cover = coverSrc(block);
            const lead = previewLead(block);
            const title = [block.title, block.titleLine2]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={block.id}
                type="button"
                className={styles.blockCard}
                onClick={() => void openEditor(block)}
                aria-label={`Редагувати блок ${block.label}`}
              >
                <div className={styles.blockCover}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={block.imageAlt || block.label} />
                  ) : (
                    <div className={styles.blockCoverEmpty}>Без зображення</div>
                  )}
                  <span className={styles.blockCoverHint}>Редагувати</span>
                </div>

                <div className={styles.blockBody}>
                  <div className={styles.blockTop}>
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.blockLabel}>{block.label}</div>
                      <div className={styles.blockKey}>{block.key}</div>
                    </div>
                    <span className={styles.blockEdit} aria-hidden>
                      <EditGlyph />
                    </span>
                  </div>

                  <p className={styles.blockTitle}>{title || "Без заголовка"}</p>
                  {lead ? <p className={styles.blockDesc}>{lead}</p> : null}

                  <div className={styles.chipRow}>
                    {fields.badge ? (
                      <span className={styles.chip}>Бейдж</span>
                    ) : null}
                    {fields.image || fields.gallery ? (
                      <span
                        className={`${styles.chip} ${cover ? styles.chipOn : ""}`}
                      >
                        Фото
                      </span>
                    ) : null}
                    {fields.cta ? (
                      <span className={styles.chip}>Кнопка</span>
                    ) : null}
                    {fields.features ? (
                      <span className={styles.chip}>
                        Переваги · {block.features.length}
                      </span>
                    ) : null}
                    {isCardSection(block.key) ? (
                      <span
                        className={`${styles.chip} ${block.items.length ? styles.chipOn : ""}`}
                      >
                        Картки
                        {block.items.length ? ` · ${block.items.length}` : ""}
                      </span>
                    ) : null}
                    {fields.paragraphs ? (
                      <span className={styles.chip}>
                        Абзаци · {block.paragraphs.length}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {editing && editingFields ? (
        <Modal
          title={editing.label}
          subtitle={`Секція «${editing.key}» · усі поля блоку`}
          onClose={() => setEditing(null)}
          xwide
        >
          <form onSubmit={save} className={styles.editor}>
            <div className={styles.editorPreview}>
              <div className={styles.editorPreviewMedia}>
                {coverSrc(editing) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverSrc(editing)}
                    alt={editing.imageAlt || editing.label}
                  />
                ) : (
                  <div className={styles.editorPreviewEmpty}>
                    Немає зображення
                  </div>
                )}
              </div>
              <div className={styles.editorPreviewMeta}>
                {editing.badge ? (
                  <span className={styles.editorPreviewBadge}>
                    {editing.badge}
                  </span>
                ) : null}
                <p className={styles.editorPreviewTitle}>
                  {[editing.title, editing.titleLine2]
                    .filter(Boolean)
                    .join(" ") || "Заголовок блоку"}
                </p>
                {previewLead(editing) || paragraphsText ? (
                  <p className={styles.editorPreviewLead}>
                    {previewLead(editing) ||
                      paragraphsText.split(/\n\s*\n/)[0] ||
                      ""}
                  </p>
                ) : null}
              </div>
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h4 className={styles.sectionTitle}>Тексти</h4>
                <p className={styles.sectionHint}>
                  Заголовки та опис, які бачать відвідувачі
                </p>
              </div>

              {editingFields.badge ? (
                <Field label="Бейдж над заголовком">
                  <input
                    value={editing.badge}
                    onChange={(event) => update("badge", event.target.value)}
                    placeholder="Наприклад: Найкращі пропозиції"
                  />
                </Field>
              ) : null}

              <div className={ui.formGrid}>
                {editingFields.title ? (
                  <Field
                    label={
                      editingFields.titleLine2
                        ? "Заголовок (1-й рядок)"
                        : "Заголовок"
                    }
                  >
                    <input
                      value={editing.title}
                      onChange={(event) => update("title", event.target.value)}
                    />
                  </Field>
                ) : null}
                {editingFields.titleLine2 ? (
                  <Field label="Заголовок (2-й рядок)">
                    <input
                      value={editing.titleLine2}
                      onChange={(event) =>
                        update("titleLine2", event.target.value)
                      }
                    />
                  </Field>
                ) : editingFields.title ? (
                  <div />
                ) : null}
              </div>

              {editingFields.description ? (
                <Field label="Опис">
                  <textarea
                    value={editing.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                </Field>
              ) : null}

              {editingFields.paragraphs ? (
                <Field label="Абзаци (розділяйте порожнім рядком)">
                  <textarea
                    style={{ minHeight: 180 }}
                    value={paragraphsText}
                    onChange={(event) => setParagraphsText(event.target.value)}
                  />
                </Field>
              ) : null}
            </section>

            {editingFields.image || editingFields.gallery ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h4 className={styles.sectionTitle}>Зображення</h4>
                  <p className={styles.sectionHint}>
                    Завантажте файл або вставте URL
                  </p>
                </div>

                {editingFields.image ? (
                  <>
                    <Field label="Зображення (URL)">
                      <input
                        value={editing.image}
                        placeholder="/images/… або /api/media/…"
                        onChange={(event) =>
                          update("image", event.target.value)
                        }
                      />
                    </Field>
                    <div className={styles.imageActions}>
                      <GhostButton
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? "Завантаження…" : "Завантажити файл"}
                      </GhostButton>
                      {editing.image ? (
                        <GhostButton onClick={() => update("image", "")}>
                          Прибрати
                        </GhostButton>
                      ) : null}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        hidden
                        onChange={(event) => {
                          void uploadSingle(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </div>
                    {editing.image ? (
                      <div className={styles.imageThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={editing.image} alt={editing.imageAlt} />
                      </div>
                    ) : null}
                  </>
                ) : null}

                {editingFields.imageAlt ? (
                  <Field label="Alt-текст зображення">
                    <input
                      value={editing.imageAlt}
                      onChange={(event) =>
                        update("imageAlt", event.target.value)
                      }
                      placeholder="Короткий опис для SEO та доступності"
                    />
                  </Field>
                ) : null}

                {editingFields.gallery ? (
                  <div>
                    <span className={ui.detailLabel}>Галерея (2+ фото)</span>
                    <ImageGalleryField
                      images={editing.images}
                      onChange={(images) => update("images", images)}
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            {editingFields.cta ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h4 className={styles.sectionTitle}>Кнопка</h4>
                  <p className={styles.sectionHint}>Заклик до дії на сайті</p>
                </div>
                <div className={ui.formGrid}>
                  <Field label="Текст кнопки">
                    <input
                      value={editing.ctaLabel}
                      onChange={(event) =>
                        update("ctaLabel", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Посилання кнопки">
                    <input
                      value={editing.ctaHref}
                      placeholder="#cruise-finder"
                      onChange={(event) =>
                        update("ctaHref", event.target.value)
                      }
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {editingFields.features ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h4 className={styles.sectionTitle}>Переваги</h4>
                  <p className={styles.sectionHint}>
                    Картки під блоком «Про нас»
                  </p>
                </div>

                {editing.features.map((feature, index) => (
                  <div key={feature.id} className={styles.featureCard}>
                    <div className={styles.featureTop}>
                      <span className={styles.featureIndex}>
                        Перевага {index + 1}
                      </span>
                      <DangerButton onClick={() => removeFeature(index)}>
                        Видалити
                      </DangerButton>
                    </div>
                    <div className={ui.formGrid}>
                      <Field label="Назва">
                        <input
                          value={feature.title}
                          onChange={(event) =>
                            updateFeature(index, {
                              title: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Іконка (URL)">
                        <input
                          value={feature.icon}
                          placeholder="/images/icons/…"
                          onChange={(event) =>
                            updateFeature(index, { icon: event.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Опис">
                      <textarea
                        value={feature.description}
                        onChange={(event) =>
                          updateFeature(index, {
                            description: event.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                ))}

                <div>
                  <GhostButton onClick={addFeature}>
                    Додати перевагу
                  </GhostButton>
                </div>
              </section>
            ) : null}

            {isCardSection(editing.key) ? (
              <ContentCardsEditor
                blockKey={editing.key}
                items={editing.items}
                onChange={(items) => update("items", items)}
              />
            ) : null}

            {formError ? <p style={errorStyle}>{formError}</p> : null}

            <div className={styles.footer}>
              <p className={styles.footerHint}>
                Зміни з’являться на сайті одразу після збереження
              </p>
              <div className={styles.footerActions}>
                <GhostButton onClick={() => setEditing(null)}>
                  Скасувати
                </GhostButton>
                <PrimaryButton type="submit" disabled={saving || uploading}>
                  {saving ? "Збереження…" : "Зберегти блок"}
                </PrimaryButton>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
