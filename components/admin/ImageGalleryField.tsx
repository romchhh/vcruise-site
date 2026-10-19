"use client";

import { useRef, useState, type DragEvent } from "react";
import styles from "./ImageGalleryField.module.css";

type ImageGalleryFieldProps = {
  images: string[];
  onChange: (images: string[]) => void;
};

export default function ImageGalleryField({
  images,
  onChange,
}: ImageGalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function addUrls(next: string[]) {
    const merged = Array.from(
      new Set([
        ...images,
        ...next.map((item) => item.trim()).filter(Boolean),
      ]),
    );
    onChange(merged);
  }

  function addFromUrl() {
    const value = url.trim();
    if (!value) return;
    addUrls([value]);
    setUrl("");
    setError("");
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      list.forEach((file) => body.append("files", file));

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "upload_failed");
      }
      addUrls(data.urls || [data.url]);
    } catch {
      setError("Не вдалося завантажити файл. Використовуйте JPG, PNG, WEBP до 8 МБ.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(event.dataTransfer.files);
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <div className={styles.root}>
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
            inputRef.current?.click();
          }
        }}
      >
        <strong>{uploading ? "Завантаження…" : "Перетягніть фото сюди"}</strong>
        <span>або натисніть, щоб обрати файли · JPG / PNG / WEBP до 8 МБ</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className={styles.urlRow}>
        <input
          type="url"
          value={url}
          placeholder="https://… або /api/media/…"
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
          Додати посилання
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {images.length === 0 ? (
        <p className={styles.empty}>
          Поки немає фото — додайте посилання або завантажте файли.
        </p>
      ) : (
        <div className={styles.grid}>
          {images.map((src, index) => (
            <article key={`${src}-${index}`} className={styles.item}>
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                {index === 0 ? (
                  <span className={styles.coverBadge}>Обкладинка</span>
                ) : null}
              </div>
              <div className={styles.actions}>
                {index !== 0 ? (
                  <button type="button" onClick={() => makeCover(index)}>
                    На обкладинку
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeAt(index)}
                >
                  Видалити
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
