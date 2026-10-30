import Image from "next/image";
import Link from "next/link";
import { buildSearchParams } from "@/lib/cruise-search/params";
import { LinerClass } from "@/types";

function buildShipSearchHref(ship: LinerClass["ships"][number]) {
  if (!ship.linerSlug) return null;

  const query = buildSearchParams({
    company: ship.company ?? "",
    liner: ship.linerSlug,
    newLinersOnly: false,
  });

  return `/search?${query}`;
}

const shipChipClass =
  "chip chip-glass normal-case text-caption leading-snug max-w-full whitespace-normal text-center max-sm:px-2.5 max-sm:py-1 sm:px-3 sm:py-1";

type LinerClassCardProps = {
  linerClass: LinerClass;
  onOpenDetails: () => void;
};

export default function LinerClassCard({
  linerClass,
  onOpenDetails,
}: LinerClassCardProps) {
  return (
    <article
      className="group relative aspect-[3/4] w-full min-w-0 overflow-hidden rounded-card liner-class-media-frame sm:aspect-[4/5] sm:min-h-[380px]"
    >
      <Image
        src={linerClass.image}
        alt={linerClass.title}
        fill
        className="liner-class-media-img"
        sizes="(max-width: 1024px) 50vw, 25vw"
      />

      <div className="liner-class-card-scrim-top" aria-hidden />
      <div className="liner-class-card-scrim-bottom" aria-hidden />

      <div
        className="absolute inset-0 z-10 flex flex-col justify-between px-3 pb-3 pt-3 sm:inset-x-0 sm:bottom-0 sm:top-auto sm:h-auto sm:justify-end sm:px-5 sm:pb-5 sm:pt-20"
      >
        <h3
          className="type-card-title shrink-0 font-bold leading-tight text-white sm:text-h3"
        >
          {linerClass.title}
        </h3>

        <div className="mt-2 flex flex-col sm:mt-3">
          <div className="flex flex-wrap content-start gap-1 sm:gap-2">
            {linerClass.ships.map((ship) => {
              const href = buildShipSearchHref(ship);

              if (!href) {
                return (
                  <span key={ship.name} className={shipChipClass}>
                    {ship.name}
                  </span>
                );
              }

              return (
                <Link
                  key={ship.name}
                  href={href}
                  className={`${shipChipClass} transition-colors hover:bg-white/30`}
                  title={`Круїзи на ${ship.name}`}
                >
                  {ship.name}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-secondary btn-secondary--block btn-card-detail mt-3 shrink-0 sm:mt-6"
            onClick={onOpenDetails}
          >
            Детальніше
          </button>
        </div>
      </div>
    </article>
  );
}
