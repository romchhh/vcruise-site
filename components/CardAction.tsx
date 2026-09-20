import { ArrowRight } from "lucide-react";

type CardActionProps = {
  className?: string;
  block?: boolean;
  labelTone?: "brand" | "black";
  showArrow?: boolean;
  onClick?: () => void;
};

export default function CardAction({
  className = "",
  block = false,
  labelTone = "brand",
  showArrow = true,
  onClick,
}: CardActionProps) {
  if (block) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`btn-secondary btn-secondary--block ${className}`}
      >
        <span>Детальніше</span>
        {showArrow ? <ArrowRight className="h-4 w-4" strokeWidth={2} /> : null}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`btn-card-action ${className}`}>
      {showArrow ? (
        <span className="btn-card-action__icon">
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
      <span
        className={`text-caption font-semibold ${
          showArrow ? "" : "px-3"
        } ${
          labelTone === "black"
            ? "text-[color:var(--color-black)]"
            : "text-[color:var(--color-brand)]"
        }`}
      >
        Детальніше
      </span>
    </button>
  );
}
