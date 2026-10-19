import styles from "./AdminUi.module.css";

type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  hint: string;
  trend?: "up" | "down" | "neutral";
};

export function StatCard({
  label,
  value,
  delta,
  hint,
  trend = "neutral",
}: StatCardProps) {
  return (
    <article className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <div className={styles.statRow}>
        <strong className={styles.statValue}>{value}</strong>
        <span className={`${styles.statDelta} ${styles[`trend_${trend}`]}`}>
          {delta}
        </span>
      </div>
      <p className={styles.statHint}>{hint}</p>
    </article>
  );
}

type AdminPageHeaderProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h2 className={styles.pageHeaderTitle}>{title}</h2>
        <p className={styles.pageHeaderLead}>{description}</p>
      </div>
      {action ? <div className={styles.pageHeaderAction}>{action}</div> : null}
    </div>
  );
}

export function AdminCard({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      {title ? (
        <header className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>{title}</h3>
            {subtitle ? <p className={styles.cardSubtitle}>{subtitle}</p> : null}
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${status}`] ?? ""}`}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    new: "Нова",
    in_progress: "В роботі",
    done: "Закрита",
    archived: "Архів",
    running: "Йде",
    success: "Успішно",
    error: "Помилка",
    published: "Опубліковано",
    open: "Відкритий",
    closed: "Закритий",
  };
  return map[status] ?? status;
}

type BtnProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

export function GhostButton({
  children,
  onClick,
  disabled,
  type = "button",
}: BtnProps) {
  return (
    <button
      type={type}
      className={styles.ghostBtn}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: BtnProps) {
  return (
    <button
      type={type}
      className={styles.primaryBtn}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  disabled,
  type = "button",
}: BtnProps) {
  return (
    <button
      type={type}
      className={styles.dangerBtn}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

type IconActionProps = {
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
};

export function EditIconButton({ label, onClick, disabled }: IconActionProps) {
  return (
    <button
      type="button"
      className={styles.iconBtn}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}

export function DeleteIconButton({
  label,
  onClick,
  disabled,
}: IconActionProps) {
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}
