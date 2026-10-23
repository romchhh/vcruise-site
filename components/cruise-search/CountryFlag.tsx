/**
 * SVG flags via CDN (not Unicode emoji — those break as letter pairs on Windows).
 * No local package import: Turbopack/CI often fails to resolve country-flag-icons subpaths.
 */
export default function CountryFlag({ code }: { code: string }) {
  const safe = code.replace(/[^A-Za-z0-9_]/g, "");
  if (!safe) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/npm/country-flag-icons@1.6.20/3x2/${safe}.svg`}
      alt=""
      width={20}
      height={14}
      loading="lazy"
      decoding="async"
      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.14)]"
    />
  );
}
