export default function NearestCruisesSkeleton() {
  return (
    <section className="bg-background py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Найближчі круїзи</span>
          </div>
          <div>
            <div className="h-10 w-3/4 rounded-lg bg-[color:var(--color-surface-muted)]" />
            <div className="mt-4 h-20 w-full rounded-lg bg-[color:var(--color-surface-muted)]" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] rounded-card bg-[color:var(--color-surface-muted)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
