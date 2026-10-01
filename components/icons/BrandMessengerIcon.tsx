import { messengerBrandIcons } from "@/lib/messenger-brands";
import type { MessengerId } from "@/lib/messengers";

type BrandMessengerIconProps = {
  brand: MessengerId;
  size?: number;
  className?: string;
  /** Brand hex from Simple Icons, or inherit parent text color */
  color?: "brand" | "current";
};

export default function BrandMessengerIcon({
  brand,
  size = 20,
  className,
  color = "current",
}: BrandMessengerIconProps) {
  const icon = messengerBrandIcons[brand];

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <title>{icon.title}</title>
      <path
        fill={color === "brand" ? `#${icon.hex}` : "currentColor"}
        d={icon.path}
      />
    </svg>
  );
}
