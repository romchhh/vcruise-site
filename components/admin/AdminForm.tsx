"use client";

import { useEffect } from "react";
import styles from "./AdminUi.module.css";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
  xwide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  xwide?: boolean;
}) {
  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.modalRoot} role="presentation">
      <button
        type="button"
        className={styles.modalBackdrop}
        aria-label="Закрити"
        onClick={onClose}
      />
      <div
        className={`${styles.modal} ${xwide ? styles.modalXWide : wide ? styles.modalWide : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHead}>
          <div>
            <h3>{title}</h3>
            {subtitle ? (
              <p className={styles.cardSubtitle} style={{ marginTop: 4 }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.ghostBtn} onClick={onClose}>
            Закрити
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}
