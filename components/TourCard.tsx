import Image from "next/image";
import { PackageTour } from "@/types";

function InfoRow({
  label,
  value,
  withDivider = true,
}: {
  label: string;
  value: string;
  withDivider?: boolean;
}) {
  return (
    <div className={withDivider ? "divider pt-3" : ""}>
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <span className="type-card-meta min-w-0 truncate text-subtitle">
          {label}
        </span>
        <span className="type-card-meta shrink-0 text-[color:var(--color-black)]">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function TourCard({
  tour,
  onDetail,
}: {
  tour: PackageTour;
  onDetail: () => void;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-card bg-white p-3 sm:p-5">
      <span className="chip chip-muted-brand type-card-meta w-fit max-w-full truncate font-semibold">
        {tour.region}
      </span>

      <h3 className="type-card-title mt-3 text-[color:var(--color-black)]">
        {tour.city}
      </h3>

      <div className="relative mt-3 aspect-[5/4] overflow-hidden rounded-card-inner sm:mt-4 sm:aspect-[4/3]">
        <Image
          src={tour.image}
          alt={tour.hotel}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 sm:px-4 sm:pb-4">
          <p className="type-card-meta line-clamp-2 font-medium leading-snug text-white">
            {tour.hotel}{" "}
            <span className="text-white/90">{"★".repeat(tour.rating)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
        <InfoRow
          label={tour.dateRange}
          value={`${tour.nights} ночей`}
          withDivider={false}
        />
        <InfoRow label="Харчування" value={tour.meals} />
        <div className="divider pt-3">
          <div className="flex items-end justify-between gap-2 sm:gap-3">
            <span className="type-card-price-label max-w-[7rem] text-subtitle sm:max-w-[120px]">
              Ціна від / за 2 дорослих
            </span>
            <span className="type-card-price text-[color:var(--color-black)]">
              ${tour.price.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDetail}
        className="btn-primary btn-primary--block btn-card-detail mt-4 sm:mt-6"
      >
        Детальніше
      </button>
    </article>
  );
}
