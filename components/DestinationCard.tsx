import Image from "next/image";
import { Destination } from "@/types";

const textShadow = "[text-shadow:0_1px_14px_rgba(0,0,0,0.55)]";

export default function DestinationCard({
  destination,
  onDetail,
}: {
  destination: Destination;
  onDetail: () => void;
}) {
  return (
    <article className="group relative aspect-[3/2] overflow-hidden rounded-card sm:aspect-[16/10]">
      <Image
        src={destination.image}
        alt={destination.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 50vw"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black/92"
        aria-hidden
      />

      <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
        <div className="min-w-0 pr-1">
          <h3
            className={`text-h4 font-bold leading-snug text-white sm:text-h3 ${textShadow}`}
          >
            {destination.title}
          </h3>
          {destination.subtitle ? (
            <p
              className={`type-card-meta mt-1.5 line-clamp-2 text-white/90 sm:mt-2 ${textShadow}`}
            >
              {destination.subtitle}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p
            className={`type-card-body leading-relaxed text-white/95 line-clamp-3 sm:line-clamp-2 ${textShadow}`}
          >
            {destination.description}
          </p>

          <button
            type="button"
            onClick={onDetail}
            className="btn-secondary btn-secondary--block btn-card-detail mt-3 sm:mt-4"
          >
            Детальніше
          </button>
        </div>
      </div>
    </article>
  );
}
