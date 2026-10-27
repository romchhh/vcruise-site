"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/components/admin/adminApi";
import { Field } from "@/components/admin/AdminForm";
import {
  DangerButton,
  GhostButton,
  PrimaryButton,
} from "@/components/admin/AdminUi";
import type { ChatOperator } from "@/lib/cms/chat";
import styles from "./ChatView.module.css";

const DEFAULT_IMAGE = "/images/chat-assistant.jpg";

function emptyOperator(sortOrder: number): ChatOperator {
  return {
    id: `tmp-${crypto.randomUUID()}`,
    name: "",
    image: DEFAULT_IMAGE,
    sortOrder,
  };
}

export default function ChatOperatorsPanel() {
  const [operators, setOperators] = useState<ChatOperator[]>([]);
  const [activeOperatorId, setActiveOperatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{
        operators: ChatOperator[];
        activeOperatorId: string | null;
      }>("/api/admin/chat/operators");
      setOperators(data.operators);
      setActiveOperatorId(data.activeOperatorId || data.operators[0]?.id || "");
    } catch {
      setError("Не вдалося завантажити операторів.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateOperator(id: string, patch: Partial<ChatOperator>) {
    setOperators((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addOperator() {
    setOperators((current) => [
      ...current,
      emptyOperator(current.length + 1),
    ]);
  }

  function removeOperator(id: string) {
    setOperators((current) => {
      const next = current.filter((item) => item.id !== id);
      if (activeOperatorId === id) {
        setActiveOperatorId(next[0]?.id || "");
      }
      return next;
    });
  }

  async function uploadPhoto(operatorKey: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingId(operatorKey);
    setError(null);
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
      const url = (data.urls?.[0] || data.url) as string;
      if (!url) throw new Error("no_url");
      setOperators((current) =>
        current.map((item, index) => {
          const key = item.id || `new-${index}`;
          return key === operatorKey ? { ...item, image: url } : item;
        })
      );
    } catch {
      setError("Не вдалося завантажити фото (JPG, PNG, WEBP до 8 МБ).");
    } finally {
      setUploadingId(null);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const data = await adminFetch<{
        operators: ChatOperator[];
        activeOperatorId: string;
      }>("/api/admin/chat/operators", {
        method: "PUT",
        body: JSON.stringify({ operators, activeOperatorId }),
      });
      setOperators(data.operators);
      setActiveOperatorId(data.activeOperatorId);
    } catch {
      setError("Збережіть хоча б одного оператора з імʼям.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.presets}>
        <p style={{ padding: 16, margin: 0 }}>Завантаження…</p>
      </section>
    );
  }

  return (
    <section className={styles.presets}>
      <div className={styles.listHead}>
        <div>
          <h3>Оператори чату</h3>
          <p className={styles.operatorsHint}>
            Імʼя та фото показуються відвідувачам у віджеті. Оберіть, хто зараз
            на лінії — його дані підуть у нові відповіді.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <GhostButton onClick={addOperator}>+ Додати оператора</GhostButton>
          <PrimaryButton onClick={() => void save()} disabled={saving}>
            {saving ? "…" : "Зберегти"}
          </PrimaryButton>
        </div>
      </div>

      {error ? <p className={styles.operatorsError}>{error}</p> : null}

      <div className={styles.operatorGrid}>
        {operators.map((operator) => {
          const rowKey = operator.id;
          const isActive = activeOperatorId === operator.id;
          const imageSrc = operator.image || DEFAULT_IMAGE;
          return (
            <article
              key={rowKey}
              className={`${styles.operatorCard} ${
                isActive ? styles.operatorCardActive : ""
              }`}
            >
              <label className={styles.operatorActiveRow}>
                <input
                  type="radio"
                  name="activeOperator"
                  checked={isActive}
                  onChange={() => setActiveOperatorId(operator.id)}
                />
                <span>{isActive ? "Зараз на лінії" : "На лінії"}</span>
              </label>

              <div className={styles.operatorPhotoRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  className={styles.operatorAvatar}
                />
                <div className={styles.operatorPhotoActions}>
                  <input
                    ref={(el) => {
                      fileRefs.current[rowKey] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className={styles.hiddenFile}
                    onChange={(event) =>
                      void uploadPhoto(rowKey, event.target.files)
                    }
                  />
                  <GhostButton
                    type="button"
                    onClick={() => fileRefs.current[rowKey]?.click()}
                    disabled={uploadingId === rowKey}
                  >
                    {uploadingId === rowKey ? "…" : "Завантажити фото"}
                  </GhostButton>
                  <Field label="Або URL">
                    <input
                      value={operator.image}
                      onChange={(event) =>
                        updateOperator(operator.id, {
                          image: event.target.value,
                        })
                      }
                      placeholder={DEFAULT_IMAGE}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Імʼя в чаті">
                <input
                  value={operator.name}
                  onChange={(event) =>
                    updateOperator(operator.id, {
                      name: event.target.value,
                    })
                  }
                  placeholder="Наприклад, Олена"
                />
              </Field>

              {operators.length > 1 ? (
                <DangerButton
                  type="button"
                  onClick={() => removeOperator(operator.id)}
                >
                  Видалити
                </DangerButton>
              ) : null}
            </article>
          );
        })}
      </div>

      {operators.length === 0 ? (
        <p style={{ padding: 16 }}>
          Ще немає операторів.{" "}
          <button
            type="button"
            style={{
              background: "none",
              border: 0,
              color: "var(--admin-accent)",
              cursor: "pointer",
              fontWeight: 700,
            }}
            onClick={addOperator}
          >
            Додати першого
          </button>
        </p>
      ) : null}

      <p className={styles.operatorsFoot}>
        Привітальне повідомлення та вмикання чату — у{" "}
        <Link href="/admin/settings">налаштуваннях</Link> (вкладка «Чат»).
      </p>
    </section>
  );
}
