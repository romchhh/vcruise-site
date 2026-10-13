const pulse = "animate-pulse bg-[#E8E8E8]";

function SearchPreloader() {
  return (
    <div
      className="flex flex-col items-center gap-4 py-6"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#E8E8E8] border-t-[color:var(--color-brand)]"
        aria-hidden
      />
      <span className="sr-only">Завантаження пошуку круїзів</span>
    </div>
  );
}

export default function CruiseSearchSkeleton() {
  return (
    <main className="bg-background pb-16 pt-28 sm:pt-32" aria-busy="true">
      <div className="section-frame">
        <div className="container-px mx-auto max-w-[1180px]">
          <div className="mb-6 sm:mb-8">
            <div className={`h-9 w-40 rounded-full ${pulse}`} />
            <div className={`mt-5 h-10 w-full max-w-md rounded-2xl ${pulse}`} />
            <div className={`mt-4 h-16 w-full max-w-2xl rounded-2xl ${pulse}`} />
          </div>

          <SearchPreloader />

          <div className="rounded-card bg-white p-5 sm:p-6 lg:p-8">
            <div className={`mb-5 h-11 w-full max-w-xs rounded-xl ${pulse}`} />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className={`h-4 w-24 rounded ${pulse}`} />
                  <div className={`h-12 w-full rounded-xl ${pulse}`} />
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className={`h-12 w-32 rounded-xl ${pulse}`} />
              <div className={`h-12 w-28 rounded-xl ${pulse}`} />
            </div>
          </div>

          <div className={`mt-8 h-5 w-56 rounded ${pulse}`} />

          <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-card bg-white"
              >
                <div className={`aspect-[16/10] ${pulse}`} />
                <div className="space-y-3 p-5">
                  <div className={`h-6 w-4/5 rounded ${pulse}`} />
                  <div className={`h-4 w-1/2 rounded ${pulse}`} />
                  <div className={`h-20 rounded-xl ${pulse}`} />
                  <div className={`h-12 rounded-xl ${pulse}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
