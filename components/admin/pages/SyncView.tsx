"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import {
  AdminCard,
  AdminPageHeader,
  DangerButton,
  GhostButton,
  PrimaryButton,
  StatCard,
  StatusBadge,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import { formatKyivDateTime } from "@/lib/datetime";
import type { SyncRun } from "@/lib/cms/store";

type SyncStatus = {
  running: boolean;
  pid: number | null;
  cruiseCount: number | null;
  lastDataUpdateAt: string | null;
  logTail: string;
  parserExists?: boolean;
};

type SyncResponse = {
  ok: boolean;
  status: SyncStatus;
  runs: SyncRun[];
};

const POLL_INTERVAL_MS = 3000;

const TRIGGER_LABELS: Record<SyncRun["triggeredBy"], string> = {
  admin: "Адмін",
  scheduler: "Планувальник",
  cli: "CLI",
};

export default function SyncView() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<SyncResponse>("/api/admin/sync");
      setStatus(data.status);
      setRuns(data.runs || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не вдалося завантажити статус",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const running = Boolean(status?.running);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [running, load]);

  async function start(mode: "full" | "quick" = "full") {
    setStarting(true);
    setError("");
    setMessage(null);
    try {
      await adminFetch("/api/admin/sync", {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      setMessage(
        mode === "quick"
          ? "Швидку синхронізацію (до 300 круїзів) запущено."
          : "Повну синхронізацію запущено.",
      );
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setError(
        text === "already_running"
          ? "Синхронізація вже виконується."
          : text === "parser_missing"
            ? "Скрипт синхронізації не знайдено на сервері."
            : text || "Не вдалося запустити синхронізацію",
      );
    } finally {
      await load();
      setStarting(false);
    }
  }

  async function stop() {
    if (!window.confirm("Зупинити поточну синхронізацію?")) return;
    setStopping(true);
    setError("");
    try {
      await adminFetch("/api/admin/sync", { method: "DELETE" });
      setMessage("Синхронізацію зупинено.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setError(
        text === "not_running"
          ? "Зараз нічого не виконується."
          : text || "Не вдалося зупинити",
      );
    } finally {
      await load();
      setStopping(false);
    }
  }

  if (!status && !error) {
    return <div className={ui.loading}>Завантаження…</div>;
  }

  return (
    <>
      <AdminPageHeader
        title="Синхронізація круїзів"
        description="Ручне оновлення бази з 4gates. Під час роботи статус і лог оновлюються автоматично."
        action={
          <div
            data-tour="tour-sync-actions"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {running ? (
              <DangerButton onClick={() => void stop()} disabled={stopping}>
                {stopping ? "Зупинка…" : "Зупинити"}
              </DangerButton>
            ) : (
              <>
                <GhostButton
                  onClick={() => void start("quick")}
                  disabled={starting || status?.parserExists === false}
                >
                  Швидко (тест)
                </GhostButton>
                <PrimaryButton
                  onClick={() => void start("full")}
                  disabled={starting || status?.parserExists === false}
                >
                  {starting ? "Запуск…" : "Запустити повну"}
                </PrimaryButton>
              </>
            )}
          </div>
        }
      />

      {error ? (
        <p style={{ color: "#b91c1c", fontWeight: 700, marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p style={{ color: "var(--admin-green)", fontWeight: 700, marginBottom: 16 }}>
          {message}
        </p>
      ) : null}

      {status ? (
        <div className={ui.stack}>
          <div className={ui.grid3}>
            <StatCard
              label="Круїзів у файлі"
              value={
                status.cruiseCount !== null && status.cruiseCount !== undefined
                  ? status.cruiseCount.toLocaleString("uk-UA")
                  : "—"
              }
              delta=""
              hint="Після фільтра компаній на сайті може бути менше"
            />
            <StatCard
              label="Останнє оновлення"
              value={
                status.lastDataUpdateAt
                  ? formatKyivDateTime(status.lastDataUpdateAt)
                  : "—"
              }
              delta=""
              hint="Київський час"
            />
            <StatCard
              label="Стан"
              value={status.running ? "Виконується" : "Готово"}
              delta=""
              hint={
                status.running
                  ? status.pid
                    ? `PID ${status.pid} · оновлення кожні 3 с`
                    : "Процес активний"
                  : status.parserExists === false
                    ? "Скрипт парсера відсутній"
                    : "Можна запускати вручну"
              }
              trend={status.running ? "up" : "neutral"}
            />
          </div>

          <AdminCard
            title="Що робить синхронізація"
            subtitle="Оптимізований пайплайн: компактний JSON, атомарна заміна файлу, скидання кешу сайту після завершення"
          >
            <ul className={ui.bulletList}>
              <li>Завантажує круїзи з 4gates і структурує маршрути/ціни</li>
              <li>Пише результат у тимчасовий файл і лише потім замінює робочий</li>
              <li>
                «Швидко» — до 300 записів для перевірки; «Повна» — вся база
              </li>
            </ul>
          </AdminCard>

          <AdminCard
            title="Лог останнього запуску"
            subtitle={status.running ? "Оновлюється автоматично" : undefined}
          >
            <pre className={ui.logBox}>
              {status.logTail?.trim() || "Лог порожній. Запустіть синхронізацію."}
            </pre>
          </AdminCard>

          <AdminCard title="Історія синхронізацій">
            {runs.length === 0 ? (
              <p className={ui.empty}>Запусків ще не було.</p>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Початок</th>
                      <th>Завершення</th>
                      <th>Статус</th>
                      <th>Круїзів</th>
                      <th>Запуск</th>
                      <th>Повідомлення</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td>{formatKyivDateTime(run.startedAt)}</td>
                        <td>
                          {run.finishedAt
                            ? formatKyivDateTime(run.finishedAt)
                            : "—"}
                        </td>
                        <td>
                          <StatusBadge status={run.status} />
                        </td>
                        <td>{run.cruiseCount ?? "—"}</td>
                        <td>
                          {TRIGGER_LABELS[run.triggeredBy] ?? run.triggeredBy}
                        </td>
                        <td>{run.message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </div>
      ) : null}
    </>
  );
}
