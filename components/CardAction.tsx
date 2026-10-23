import { ArrowRight } from "lucide-react";

type CardActionProps = {
  className?: string;
  block?: boolean;
  labelTone?: "brand" | "black";
  showArrow?: boolean;
  onClick?: () => void;
  /** Visual-only (parent handles the click — avoids nested buttons). */
  decorative?: boolean;
};

export default function CardAction({
  className = "",
  block = false,
  labelTone = "brand",
  showArrow = true,
  onClick,
  decorative = false,
}: CardActionProps) {
  const labelClass = `text-caption font-semibold ${
    showArrow ? "" : "px-3"
  } ${
    labelTone === "black"
      ? "text-[color:var(--color-black)]"
      : "text-[color:var(--color-brand)]"
  }`;

  const content = (
    <>
      {showArrow ? (
        <span className="btn-card-action__icon">
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
      <span className={labelClass}>Детальніше</span>
    </>
  );

  if (block) {
    if (decorative) {
      return (
        <span
          className={`btn-secondary btn-secondary--block btn-card-detail ${className}`}
          aria-hidden
        >
          <span>Детальніше</span>
          {showArrow ? <ArrowRight className="h-4 w-4" strokeWidth={2} /> : null}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={`btn-secondary btn-secondary--block btn-card-detail ${className}`}
      >
        <span>Детальніше</span>
        {showArrow ? <ArrowRight className="h-4 w-4" strokeWidth={2} /> : null}
      </button>
    );
  }

  if (decorative) {
    return (
      <span className={`btn-card-action ${className}`} aria-hidden>
        {content}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`btn-card-action ${className}`}>
      {content}
    </button>
  );
}
