import Image from "next/image";
import { LinerClass } from "@/types";

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
          {linerClass.ships.map((ship) => (
            <span key={ship} className="chip chip-glass text-small normal-case">
              {ship}
            </span>
          ))}
        </div>

        <button type="button" className="btn-secondary btn-secondary--block mt-4">
          Детальніше
        </button>
      </div>
    </article>
  );
}
