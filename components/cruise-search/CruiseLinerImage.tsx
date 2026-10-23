import Image from "next/image";

const FOURGATES_HOST = "4gates.cruises";

function isFourgatesUrl(src: string) {
  try {
    const url = new URL(src);
    return url.hostname === FOURGATES_HOST || url.hostname.endsWith(`.${FOURGATES_HOST}`);
  } catch {
    return false;
  }
}

type CruiseLinerImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  /** e.g. aspect card `aspect-[4/3]` parent with `relative` */
  fill?: boolean;
  ariaHidden?: boolean;
};

/**
 * Liner photos from 4gates use a plain <img> so dev/prod work even if
 * next.config image patterns are not hot-reloaded yet.
 */
export default function CruiseLinerImage({
  src,
  alt,
  className = "object-cover",
  sizes,
  priority = false,
  fill = true,
  ariaHidden = false,
}: CruiseLinerImageProps) {
  if (isFourgatesUrl(src) || src.startsWith("http://") || src.startsWith("https://")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external hosts skip next/image allowlist
      <img
        src={src}
        alt={ariaHidden ? "" : alt}
        className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        sizes={sizes}
        aria-hidden={ariaHidden || undefined}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      aria-hidden={ariaHidden || undefined}
    />
  );
}
