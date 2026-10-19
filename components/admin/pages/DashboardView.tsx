"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import {
  AdminCard,
  AdminPageHeader,
  GhostButton,
  PrimaryButton,
  StatCard,
  StatusBadge,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import { formatKyivDateTime } from "@/lib/datetime";
import type { Lead } from "@/lib/cms/store";

type DashboardStats = {
  leadsTotal: number;
  leadsNew: number;
  leadsToday: number;
  blocksCount: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  cruiseCount?: number;
  cruiseDataUpdatedAt?: string;
  chatRatingAverage?: number | null;
  chatRatingCount?: number;
};

type RecentRating = {
  id: string;
  rating?: number | null;
  comment: string;
  ratedAt?: string | null;
  visitorName: string;
};

type DashboardResponse = {
  ok: boolean;
  stats: DashboardStats;
  recentLeads: Lead[];
  recentRatings?: RecentRating[];
};

const linkStyle = { textDecoration: "none", display: "inline-block" } as const;

export default function DashboardView() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch<DashboardResponse>("/api/admin/dashboard")
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не вдалося завантажити дані",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSync() {
    setSyncing(true);
    setSyncNote(null);
    try {
      await adminFetch("/api/admin/sync", {
        method: "POST",
        body: JSON.stringify({ mode: "full" }),
      });
      setSyncNote("Синхронізацію запущено.");
      router.push("/admin/sync");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setSyncNote(
        message === "already_running"
          ? "Синхронізація вже йде — відкрийте розділ Sync."
          : message || "Не вдалося запустити",
      );
    } finally {
      setSyncing(false);
    }
  }

  if (error) {
    return <div className={ui.empty}>{error}</div>;
  }

  if (!data) {
    return <div className={ui.loading}>Завантаження…</div>;
  }

  const { stats, recentLeads, recentRatings = [] } = data;

  return (
    <>
      <AdminPageHeader
        title="Дашборд"
        description="Огляд заявок, круїзів у базі та стану синхронізації."
        action={
          <div data-tour="tour-dashboard-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PrimaryButton onClick={() => void runSync()} disabled={syncing}>
              {syncing ? "Запуск…" : "Оновити круїзи"}
            </PrimaryButton>
            <Link href="/admin/leads" className={ui.ghostBtn} style={linkStyle}>
              Заявки
            </Link>
            <Link href="/admin/chat" className={ui.ghostBtn} style={linkStyle}>
              Чат
            </Link>
            <GhostButton onClick={() => router.push("/admin/sync")}>
              Sync
            </GhostButton>
          </div>
        }
      />

      {syncNote ? (
        <p style={{ margin: "0 0 16px", fontWeight: 700, color: "var(--admin-orange)" }}>
          {syncNote}
        </p>
      ) : null}

      <div className={ui.stack}>
        <div className={ui.grid4} data-tour="tour-dashboard-stats">
          <StatCard
            label="Нові заявки"
            value={String(stats.leadsNew)}
            delta={stats.leadsToday > 0 ? `+${stats.leadsToday}` : "0"}
            hint="Нових сьогодні"
            trend={stats.leadsNew > 0 ? "up" : "neutral"}
          />
          <StatCard
            label="Оцінка чату"
            value={
              stats.chatRatingAverage != null
                ? `★ ${stats.chatRatingAverage.toFixed(1)}`
                : "—"
            }
            delta=""
            hint={
              stats.chatRatingCount
                ? `${stats.chatRatingCount} оцінок`
                : "Ще немає оцінок"
            }
            trend={
              stats.chatRatingAverage != null && stats.chatRatingAverage >= 4
                ? "up"
                : "neutral"
            }
          />
          <StatCard
            label="Круїзів у базі"
            value={
              stats.cruiseCount !== undefined
                ? stats.cruiseCount.toLocaleString("uk-UA")
                : "—"
            }
            delta=""
            hint={`Блоків контенту: ${stats.blocksCount}`}
          />
          <StatCard
            label="Остання синхронізація"
            value={stats.lastSyncAt ? formatKyivDateTime(stats.lastSyncAt) : "—"}
            delta=""
            hint={
              stats.lastSyncStatus
                ? `Статус: ${
                    stats.lastSyncStatus === "success"
                      ? "успішно"
                      : stats.lastSyncStatus === "error"
                        ? "помилка"
                        : "виконується"
                  }`
                : "Ще не запускалась"
            }
            trend={
              stats.lastSyncStatus === "error"
                ? "down"
                : stats.lastSyncStatus === "success"
                  ? "up"
                  : "neutral"
            }
          />
        </div>

        <AdminCard
          title="Останні заявки"
          subtitle="Відкрийте розділ «Заявки», щоб обробити їх"
        >
          {recentLeads.length === 0 ? (
            <p className={ui.empty}>Заявок поки немає.</p>
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Ім&apos;я</th>
                    <th>Телефон</th>
                    <th>Джерело</th>
                    <th>Круїз</th>
                    <th>Статус</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <Link href="/admin/leads" style={{ fontWeight: 700 }}>
                          {lead.name}
                        </Link>
                      </td>
                      <td>{lead.phone}</td>
                      <td>{lead.source || "—"}</td>
                      <td>{lead.cruise || "—"}</td>
                      <td>
                        <StatusBadge status={lead.status} />
                      </td>
                      <td>{formatKyivDateTime(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard
          title="Оцінки чату"
          subtitle="Відвідувачі оцінюють діалог після закриття або довгої паузи"
        >
          {recentRatings.length === 0 ? (
            <p className={ui.empty}>Оцінок поки немає.</p>
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Клієнт</th>
                    <th>Оцінка</th>
                    <th>Коментар</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRatings.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href="/admin/chat" style={{ fontWeight: 700 }}>
                          {item.visitorName}
                        </Link>
                      </td>
                      <td>★ {item.rating}/5</td>
                      <td>{item.comment || "—"}</td>
                      <td>
                        {item.ratedAt ? formatKyivDateTime(item.ratedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </>
  );
}
