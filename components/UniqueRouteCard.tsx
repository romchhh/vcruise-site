import Image from "next/image";
import Link from "next/link";
import type { UniqueRoute } from "@/types";

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function nightsLabel(nights: number) {
  const n = Math.max(nights, 1);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ніч`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} ночі`;
  }
  return `${n} ночей`;
}

type UniqueRouteCardProps = {
  route: UniqueRoute;
};

export default function UniqueRouteCard({ route }: UniqueRouteCardProps) {
  const hasLinerHover =
    route.linerImage != null && route.linerImage !== route.coverImage;

  return (
    <article className="group relative flex aspect-[3/4] min-h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-card sm:min-h-[440px]">
      <div className="absolute inset-0">
        <Image
          src={route.coverImage}
          alt={route.title}
          fill
          className={`object-cover transition-opacity duration-500 ease-in-out ${
            hasLinerHover ? "opacity-100 group-hover:opacity-0" : ""
          }`}
          sizes="(max-width: 1024px) 88vw, 33vw"
        />
        {hasLinerHover ? (
          <Image
            src={route.linerImage!}
            alt=""
            fill
            className="object-cover opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100"
            sizes="(max-width: 1024px) 88vw, 33vw"
            aria-hidden
          />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a1214]/95 via-[#0a1214]/55 to-[#0a1214]/10"
        aria-hidden
      />

      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap gap-2 p-4 sm:p-5">
        <span className="max-w-full truncate rounded-full bg-white px-3.5 py-1.5 text-caption font-medium text-[color:var(--color-black)]">
          {route.region}
        </span>
        <span className="max-w-full truncate rounded-full bg-white px-3.5 py-1.5 text-caption font-medium text-[color:var(--color-brand)]">
          {route.line}
        </span>
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col justify-end p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 flex-col justify-end">
          <h3 className="type-card-title line-clamp-2 min-h-[2.65em] text-white">
            {route.title}
          </h3>
          <p className="type-card-body mt-2 line-clamp-2 text-white/75">
            {route.route}
          </p>

          <div className="my-4 h-px bg-white/20" />

          <div className="type-card-meta flex items-center justify-between gap-3 text-white/90">
            <span className="min-w-0 truncate">{route.dateRange}</span>
            <span className="type-card-meta shrink-0 rounded-full bg-white px-3 py-1 font-medium text-[color:var(--color-brand)]">
              {nightsLabel(route.nights)}
            </span>
          </div>

          <div className="my-4 h-px bg-white/20" />

          <div className="flex items-end justify-between gap-3">
            <span className="type-card-price-label max-w-[120px] text-white/70">
              Ціна від / за особу
            </span>
            <span className="type-card-price text-white">
              {formatUsd(route.price)}
            </span>
          </div>
        </div>

        <Link
          href={route.href}
          className="btn-secondary btn-secondary--block btn-card-detail mt-4 shrink-0 sm:mt-6"
        >
          Детальніше
        </Link>
      </div>
    </article>
  );
}
