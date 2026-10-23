import Image from "next/image";
import { Destination } from "@/types";
import CardAction from "./CardAction";

export default function DestinationCard({
  destination,
  onDetail,
}: {
  destination: Destination;
  onDetail: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDetail}
      className="group relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-card text-left"
      aria-label={`${destination.title} — детальніше`}
    >
      <Image
        src={destination.image}
        alt=""
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 50vw"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 max-w-[70%]">
          <h3 className="type-card-title text-white">{destination.title}</h3>
          <p className="type-card-body mt-2 max-w-md text-white/80">
            {destination.description}
          </p>
        </div>

        <CardAction labelTone="black" decorative />
      </div>
    </button>
  );
}
