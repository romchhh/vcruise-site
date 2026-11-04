type Props = {
  label: string;
  className?: string;
  /** block — центр блоку (план палуби, модалка опису) */
  variant?: "inline" | "block";
};

export default function CruiseInlineLoader({
  label,
  className = "",
  variant = "inline",
}: Props) {
  const spinner = (
    <div
      className="h-9 w-9 shrink-0 animate-spin rounded-full border-[3px] border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
      aria-hidden
    />
  );

  if (variant === "block") {
    return (
      <div
        className={`flex min-h-48 flex-col items-center justify-center gap-3 px-4 py-8 text-center ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {spinner}
        <p className="text-caption text-subtitle">{label}</p>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-3 py-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {spinner}
      <span className="text-caption text-subtitle">{label}</span>
    </div>
  );
}
