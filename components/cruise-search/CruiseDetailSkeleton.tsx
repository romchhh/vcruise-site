import CruisePagePreloader from "./CruisePagePreloader";

const pulse = "animate-pulse bg-[#E8E8E8]";

export default function CruiseDetailSkeleton() {
  return (
    <main className="bg-background pb-16 pt-28 sm:pt-32" aria-busy="true">
      <div className="section-frame">
        <div className="container-px mx-auto max-w-[1180px]">
          <div className={`h-5 w-48 rounded ${pulse}`} />
          <CruisePagePreloader label="Завантажуємо круїз…" />
          <div className="overflow-hidden rounded-card bg-white">
            <div className={`aspect-[16/9] ${pulse}`} />
            <div className="space-y-3 p-5 sm:p-6">
              <div className={`h-6 w-2/3 rounded ${pulse}`} />
              <div className={`h-4 w-full rounded ${pulse}`} />
              <div className={`h-4 w-4/5 rounded ${pulse}`} />
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-card border border-[color:var(--color-line)] bg-white p-5 sm:p-6">
            <div className={`h-8 w-40 rounded ${pulse}`} />
            <div className={`mt-6 h-48 w-full rounded-card ${pulse}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
