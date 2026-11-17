"use client";

import { useRef, useState, type DragEvent } from "react";
import styles from "./ImageDropField.module.css";

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** Short helper under the dropzone. */
  hint?: string;
  emptyLabel?: string;
};

export default function ImageDropField({
  value,
  onChange,
  hint = "JPG / PNG / WEBP до 8 МБ",
  emptyLabel = "Перетягніть фото сюди або натисніть, щоб обрати",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("files", file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "upload_failed");
      }
      const next = (data.urls?.[0] || data.url || "") as string;
      if (!next) throw new Error("empty_url");
      onChange(next);
    } catch {
      setError(
        "Не вдалося завантажити файл. Використовуйте JPG, PNG, WEBP до 8 МБ.",
      );
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function addFromUrl() {
    const next = url.trim();
    if (!next) return;
    onChange(next);
    setUrl("");
    setError("");
  }

  return (
    <div className={styles.root}>
      {value ? (
        <div className={styles.previewCard}>
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" />
          </div>
          <div className={styles.previewMeta}>
            <p className={styles.previewUrl} title={value}>
              {value}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                Замінити
              </button>
              <button
                type="button"
                className={styles.remove}
                onClick={() => onChange("")}
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <strong>
            {uploading ? "Завантаження…" : "Перетягніть фото сюди"}
          </strong>
          <span>{emptyLabel}</span>
          <span className={styles.hint}>{hint}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
          event.target.value = "";
        }}
      />

      <div className={styles.urlRow}>
        <input
          type="url"
          value={url}
          placeholder="або вставте URL /api/media/…"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addFromUrl();
            }
          }}
        />
        <button
          type="button"
          className={styles.urlBtn}
          onClick={addFromUrl}
          disabled={!url.trim()}
        >
          Додати
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
