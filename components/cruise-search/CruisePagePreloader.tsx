type CruisePagePreloaderProps = {
  label?: string;
  className?: string;
};

export default function CruisePagePreloader({
  label = "Завантаження…",
  className = "",
}: CruisePagePreloaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-16 sm:py-24 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-[3px] border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
        aria-hidden
      />
      <p className="text-body font-medium text-[color:var(--color-black)]">
        {label}
      </p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
