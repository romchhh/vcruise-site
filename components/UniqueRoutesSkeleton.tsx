export default function UniqueRoutesSkeleton() {
  return (
    <section className="section-frame" aria-hidden>
      <div className="overflow-hidden rounded-shell bg-[color:var(--color-brand)] py-14 sm:py-20 lg:py-24">
        <div className="container-px mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
            <div className="h-10 w-48 animate-pulse rounded-full bg-white/20" />
            <div className="space-y-4">
              <div className="h-12 w-full max-w-lg animate-pulse rounded-2xl bg-white/20" />
              <div className="h-20 w-full max-w-xl animate-pulse rounded-2xl bg-white/15" />
            </div>
          </div>
          <div className="unique-routes-scroll mt-14 flex gap-3 overflow-hidden sm:gap-4 lg:grid lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[3/4] w-[min(100%,22.5rem)] shrink-0 animate-pulse overflow-hidden rounded-card bg-white/10 sm:w-[min(88vw,26rem)] lg:w-auto"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
