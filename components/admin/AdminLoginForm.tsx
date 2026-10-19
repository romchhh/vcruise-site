"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";
import styles from "./AdminLoginForm.module.css";

function LoginFormInner() {
  const { session, ready, login } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    const next = searchParams.get("next") || "/admin/dashboard";
    router.replace(next);
  }, [ready, session, router, searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    void login(loginValue, password, remember)
      .then((ok) => {
        if (!ok) {
          setError("Невірний логін або пароль");
          setSubmitting(false);
          return;
        }

        const next = searchParams.get("next") || "/admin/dashboard";
        router.replace(next);
      })
      .catch(() => {
        setError("Не вдалося увійти. Спробуйте ще раз.");
        setSubmitting(false);
      });
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.logo}>VCRUISE</span>
          <span className={styles.badge}>Admin</span>
        </div>

        <div className={styles.intro}>
          <h1 className={styles.title}>Вхід до панелі керування</h1>
          <p className={styles.lead}>
            Заявки, контент сайту, налаштування та синхронізація круїзів.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Логін</span>
            <input
              type="text"
              name="login"
              autoComplete="username"
              value={loginValue}
              onChange={(event) => setLoginValue(event.target.value)}
              placeholder="login"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Пароль</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <label className={styles.remember}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Запам&apos;ятати мене</span>
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Вхід…" : "Увійти"}
          </button>
        </form>
      </div>

      <div className={styles.visual} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="" className={styles.visualImage} />
        <div className={styles.visualShade} />
      </div>
    </div>
  );
}

export default function AdminLoginForm() {
  return (
    <Suspense
      fallback={
        <div
          style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
        >
          <p style={{ color: "#6e6e6e", fontWeight: 600 }}>Завантаження…</p>
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
