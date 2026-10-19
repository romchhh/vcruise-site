import type { AdminNavIcon } from "@/lib/admin/nav";

type IconProps = {
  name: AdminNavIcon;
  className?: string;
};

export default function AdminIcon({ name, className }: IconProps) {
  const common = {
    className,
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M4 13h6V4H4v9zm10 7h6V11h-6v9zM4 20h6v-5H4v5zm10-11h6V4h-6v5z" />
        </svg>
      );
    case "leads":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h10M4 18h14" />
          <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <path d="M4 7h16v12H4z" />
          <path d="M8 7V5a4 4 0 0 1 8 0v2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "sync":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 0 1-15.4 6.4" />
          <path d="M3 12a9 9 0 0 1 15.4-6.4" />
          <path d="M21 4v6h-6M3 20v-6h6" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    default:
      return null;
  }
}
