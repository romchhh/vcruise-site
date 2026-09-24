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

export default function LinerClassCard({ linerClass }: { linerClass: LinerClass }) {
  return (
    <article className="relative aspect-[3/4.2] overflow-hidden rounded-card">
      <Image
        src={linerClass.image}
        alt={linerClass.title}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/5" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col px-4 pb-4 pt-24 sm:px-5 sm:pb-5">
        <h3 className="text-h4 font-bold text-white">{linerClass.title}</h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {linerClass.ships.map((ship) => {
            const href = buildShipSearchHref(ship);

            if (!href) {
              return (
                <span
                  key={ship.name}
                  className="chip chip-glass text-small normal-case"
                >
                  {ship.name}
                </span>
              );
            }

            return (
              <Link
                key={ship.name}
                href={href}
                className="chip chip-glass text-small normal-case transition-colors hover:bg-white/25"
                title={`Круїзи на ${ship.name}`}
              >
                {ship.name}
              </Link>
            );
          })}
        </div>

        <Link
          href="/search"
          className="btn-secondary btn-secondary--block mt-4"
        >
          Детальніше
        </Link>
      </div>
    </article>
  );
}
