"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminIcon from "./AdminIcon";
import AdminTour from "./AdminTour";
import { useAdminAuth } from "./AdminAuthProvider";
import { adminFetch } from "./adminApi";
import { ADMIN_NAV, getAdminPageTitle } from "@/lib/admin/nav";
import {
  ADMIN_TOUR_EVENT,
  completeAdminTour,
  isAdminTourForced,
  requestAdminTour,
  shouldShowAdminTour,
} from "@/lib/admin/tour";
import {
  playNewChatSound,
  playNewLeadSound,
  unlockChatSound,
} from "@/lib/chat/sound";
import type { ChatConversation } from "@/lib/cms/chat";
import type { Lead } from "@/lib/cms/store";
import styles from "./AdminShell.module.css";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const knownLeadIds = useRef<Set<string> | null>(null);
  const knownChatIds = useRef<Set<string> | null>(null);

  const refreshBadges = useCallback(() => {
    void adminFetch<{ leads: Lead[] }>("/api/admin/leads")
      .then((data) => {
        const leads = data.leads || [];
        const newLeads = leads.filter((lead) => lead.status === "new");
        setNewLeadsCount(newLeads.length);

        if (knownLeadIds.current) {
          const brandNew = newLeads.filter(
            (lead) => !knownLeadIds.current!.has(lead.id)
          );
          if (brandNew.length > 0) playNewLeadSound();
        }
        knownLeadIds.current = new Set(leads.map((lead) => lead.id));
      })
      .catch(() => {
        // Ignore while session boots / offline
      });

    void adminFetch<{
      unreadTotal: number;
      conversations?: ChatConversation[];
    }>("/api/admin/chat")
      .then((data) => {
        setChatUnread(data.unreadTotal || 0);
        const conversations = data.conversations || [];
        if (knownChatIds.current) {
          const brandNew = conversations.filter(
            (item) => !knownChatIds.current!.has(item.id)
          );
          if (brandNew.length > 0) playNewChatSound();
        }
        knownChatIds.current = new Set(conversations.map((item) => item.id));
      })
      .catch(() => {
        // Ignore while session boots / offline
      });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const unlock = () => unlockChatSound();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    refreshBadges();
    const timer = window.setInterval(refreshBadges, 8000);
    return () => window.clearInterval(timer);
  }, [refreshBadges, pathname]);

  useEffect(() => {
    if (tourActive) return;
    if (!shouldShowAdminTour()) return;
    const force = isAdminTourForced();
    if (!force && pathname !== "/admin/dashboard") return;
    const timer = window.setTimeout(
      () => setTourActive(true),
      force ? 120 : 600
    );
    return () => window.clearTimeout(timer);
  }, [pathname, tourActive]);

  useEffect(() => {
    const onStartTour = () => setTourActive(true);
    window.addEventListener(ADMIN_TOUR_EVENT, onStartTour);
    return () => window.removeEventListener(ADMIN_TOUR_EVENT, onStartTour);
  }, []);

  function finishTour() {
    completeAdminTour();
    setTourActive(false);
  }

  async function handleLogout() {
    await logout();
    router.replace("/admin");
  }

  function handleInstructions() {
    requestAdminTour();
    router.push("/admin/dashboard");
    setTourActive(true);
  }

  return (
    <div className={styles.shell}>
      <div
        className={`${styles.backdrop} ${menuOpen ? styles.backdropOpen : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        data-tour="tour-sidebar"
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <Link href="/admin/dashboard" className={styles.brand}>
            <span className={styles.brandMark}>VCRUISE</span>
            <span className={styles.brandBadge}>Admin</span>
          </Link>
        </div>

        <nav className={styles.nav}>
          {ADMIN_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge =
              item.href === "/admin/leads" && newLeadsCount > 0
                ? String(newLeadsCount)
                : item.href === "/admin/chat" && chatUnread > 0
                  ? String(chatUnread)
                  : item.badge;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <AdminIcon name={item.icon} />
                <span>{item.label}</span>
                {badge ? <span className={styles.navBadge}>{badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>
              {session?.login.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{session?.login}</strong>
              <span>{session?.name || "Адміністратор"}</span>
            </div>
          </div>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Вийти
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Відкрити меню"
          >
            <span />
            <span />
            <span />
          </button>

          <div className={styles.topbarCopy}>
            <p className={styles.eyebrow}>VCRUISE</p>
            <h1 className={styles.pageTitle}>{getAdminPageTitle(pathname)}</h1>
          </div>

          <div className={styles.topbarActions}>
            <Link href="/admin/sync" className={styles.quickAction}>
              Sync круїзів
            </Link>
            <Link href="/admin/chat" className={styles.quickAction}>
              Чат
              {chatUnread > 0 ? (
                <span className={styles.quickBadge}>
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              data-tour="tour-instructions"
              className={styles.siteLink}
              onClick={handleInstructions}
            >
              Інструкції
            </button>
            <Link href="/" className={styles.siteLink} target="_blank">
              Сайт
            </Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>

      {tourActive ? (
        <AdminTour onComplete={finishTour} onSkip={finishTour} />
      ) : null}
    </div>
  );
}
