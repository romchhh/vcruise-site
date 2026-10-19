"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field, Modal } from "@/components/admin/AdminForm";
import {
  AdminCard,
  AdminPageHeader,
  DangerButton,
  EditIconButton,
  GhostButton,
  PrimaryButton,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import ImageGalleryField from "@/components/admin/ImageGalleryField";
import type { ContentBlock, ContentBlockFeature } from "@/lib/cms/store";

const errorStyle = { color: "#b91c1c", fontWeight: 700, fontSize: 13 } as const;

function hasParagraphs(block: ContentBlock) {
  return block.key === "about" || block.paragraphs.length > 0;
}

function hasGallery(block: ContentBlock) {
  return block.key === "cta" || block.images.length > 0;
}

function hasFeatures(block: ContentBlock) {
  return block.key === "about" || block.features.length > 0;
}

function normalizeBlock(block: ContentBlock): ContentBlock {
  return {
    ...block,
    paragraphs: Array.isArray(block.paragraphs) ? block.paragraphs : [],
    images: Array.isArray(block.images) ? block.images : [],
    features: Array.isArray(block.features) ? block.features : [],
  };
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

  function openEditor(block: ContentBlock) {
    setEditing(normalizeBlock(block));
    setParagraphsText(block.paragraphs.join("\n\n"));
    setFormError("");
  }

  function update<K extends keyof ContentBlock>(
    key: K,
    value: ContentBlock[K],
  ) {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateFeature(
    index: number,
    patch: Partial<ContentBlockFeature>,
  ) {
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
    if (!editing) return;
    setSaving(true);
    setFormError("");

    const payload: ContentBlock = {
      ...editing,
      paragraphs: hasParagraphs(editing)
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
        description="Редагуйте тексти, зображення та заклики до дії для блоків головної сторінки."
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
          {blocks.map((block) => (
            <AdminCard key={block.id}>
              <div className={ui.propertyCover}>
                {block.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.image} alt={block.imageAlt || block.label} />
                ) : block.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.images[0]} alt={block.label} />
                ) : (
                  <div className={ui.propertyCoverEmpty}>Без зображення</div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3 className={ui.cardTitle}>{block.label}</h3>
                  <p className={ui.cardSubtitle}>{block.key}</p>
                </div>
                <EditIconButton
                  label="Редагувати"
                  onClick={() => openEditor(block)}
                />
              </div>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                {block.title || "—"}
                {block.titleLine2 ? ` ${block.titleLine2}` : ""}
              </p>
            </AdminCard>
          ))}
        </div>
      )}

      {editing ? (
        <Modal
          title={`Редагувати: ${editing.label}`}
          onClose={() => setEditing(null)}
          wide
        >
          <form onSubmit={save} className={ui.modalBody}>
            <div className={ui.formGrid}>
              <Field label="Назва блоку">
                <input value={editing.label} readOnly />
              </Field>
              <Field label="Бейдж">
                <input
                  value={editing.badge}
                  onChange={(event) => update("badge", event.target.value)}
                />
              </Field>
              <Field label="Заголовок">
                <input
                  value={editing.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </Field>
              <Field label="Заголовок (2-й рядок)">
                <input
                  value={editing.titleLine2}
                  onChange={(event) => update("titleLine2", event.target.value)}
                />
              </Field>
            </div>

            <Field label="Опис">
              <textarea
                value={editing.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </Field>

            {hasParagraphs(editing) ? (
              <Field label="Абзаци (розділяйте порожнім рядком)">
                <textarea
                  style={{ minHeight: 180 }}
                  value={paragraphsText}
                  onChange={(event) => setParagraphsText(event.target.value)}
                />
              </Field>
            ) : null}

            <Field label="Зображення (URL)">
              <input
                value={editing.image}
                placeholder="/images/… або /api/media/…"
                onChange={(event) => update("image", event.target.value)}
              />
            </Field>
            <div className={ui.formActions} style={{ marginTop: 0 }}>
              <GhostButton
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Завантаження…" : "Завантажити зображення"}
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
              <div className={ui.tableThumb} style={{ width: 160, height: 100 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editing.image} alt={editing.imageAlt} />
              </div>
            ) : null}

            <div className={ui.formGrid}>
              <Field label="Alt-текст зображення">
                <input
                  value={editing.imageAlt}
                  onChange={(event) => update("imageAlt", event.target.value)}
                />
              </Field>
              <div />
              <Field label="Текст кнопки">
                <input
                  value={editing.ctaLabel}
                  onChange={(event) => update("ctaLabel", event.target.value)}
                />
              </Field>
              <Field label="Посилання кнопки">
                <input
                  value={editing.ctaHref}
                  placeholder="#cruise-finder"
                  onChange={(event) => update("ctaHref", event.target.value)}
                />
              </Field>
            </div>

            {hasGallery(editing) ? (
              <div className={ui.modalBody}>
                <span className={ui.detailLabel}>Галерея зображень</span>
                <ImageGalleryField
                  images={editing.images}
                  onChange={(images) => update("images", images)}
                />
              </div>
            ) : null}

            {hasFeatures(editing) ? (
              <div className={ui.modalBody}>
                <span className={ui.detailLabel}>Переваги</span>
                {editing.features.map((feature, index) => (
                  <div
                    key={feature.id}
                    className={ui.card}
                    style={{ padding: 14, boxShadow: "none" }}
                  >
                    <div className={ui.modalBody}>
                      <div className={ui.formGrid}>
                        <Field label="Назва">
                          <input
                            value={feature.title}
                            onChange={(event) =>
                              updateFeature(index, { title: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Іконка">
                          <input
                            value={feature.icon}
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
                      <div>
                        <DangerButton onClick={() => removeFeature(index)}>
                          Видалити
                        </DangerButton>
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <GhostButton onClick={addFeature}>Додати перевагу</GhostButton>
                </div>
              </div>
            ) : null}

            {formError ? <p style={errorStyle}>{formError}</p> : null}

            <div className={ui.formActions}>
              <PrimaryButton type="submit" disabled={saving || uploading}>
                {saving ? "Збереження…" : "Зберегти"}
              </PrimaryButton>
              <GhostButton onClick={() => setEditing(null)}>Скасувати</GhostButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
