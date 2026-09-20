import Image from "next/image";
import { Cruise } from "@/types";

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
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-subtitle">
          {label}
        </span>
        <span className="text-caption text-[color:var(--color-black)]">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function CruiseCard({ cruise }: { cruise: Cruise }) {
  return (
    <article className="flex flex-col rounded-card bg-white p-4 sm:p-5">
      <span className="chip chip-muted-brand w-fit">{cruise.region}</span>

      <h3 className="text-h4 mt-3 font-bold text-[color:var(--color-black)]">
        {cruise.title}
      </h3>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-card-inner">
        <Image
          src={cruise.image}
          alt={cruise.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <p className="text-caption font-medium text-white">{cruise.line}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow
          label={cruise.dateRange}
          value={`${cruise.nights} ночей`}
          withDivider={false}
        />
        <InfoRow label="Маршрут" value={cruise.route} />
        <div className="divider pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-caption max-w-[120px] leading-snug text-subtitle">
              Ціна від / за особу
            </span>
            <span className="text-h4 font-bold leading-none text-[color:var(--color-black)]">
              ${cruise.price.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>

      <button type="button" className="btn-primary btn-primary--block mt-4">
        Детальніше
      </button>
    </article>
  );
}
