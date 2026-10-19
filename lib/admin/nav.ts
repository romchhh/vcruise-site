export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
  badge?: string;
};

export type AdminNavIcon =
  | "dashboard"
  | "leads"
  | "content"
  | "chat"
  | "sync"
  | "settings";

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Дашборд", icon: "dashboard" },
  { href: "/admin/leads", label: "Заявки", icon: "leads" },
  { href: "/admin/chat", label: "Чат", icon: "chat" },
  { href: "/admin/content", label: "Контент", icon: "content" },
  { href: "/admin/sync", label: "Синхронізація", icon: "sync" },
  { href: "/admin/settings", label: "Налаштування", icon: "settings" },
];

export function getAdminPageTitle(pathname: string) {
  const item = ADMIN_NAV.find((entry) => pathname.startsWith(entry.href));
  return item?.label ?? "Адмін-панель";
}
