export default function HotDealsSkeleton() {
  return (
    <section className="bg-background py-14 sm:py-20 lg:py-24" aria-hidden>
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div className="h-10 w-48 animate-pulse rounded-full bg-[#E8E8E8]" />
          <div className="space-y-4">
            <div className="h-12 w-full max-w-lg animate-pulse rounded-2xl bg-[#E8E8E8]" />
            <div className="h-20 w-full max-w-xl animate-pulse rounded-2xl bg-[#E8E8E8]" />
          </div>
        </div>
        <div className="mt-14 flex gap-3 overflow-hidden sm:gap-4 lg:grid lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="w-[min(92vw,24rem)] shrink-0 overflow-hidden rounded-card bg-white lg:w-auto"
            >
              <div className="aspect-[16/10] animate-pulse bg-[#E8E8E8]" />
              <div className="space-y-3 p-5">
                <div className="h-6 w-4/5 animate-pulse rounded bg-[#E8E8E8]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8E8E8]" />
                <div className="h-10 animate-pulse rounded bg-[#E8E8E8]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#E8E8E8]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
