import { getUniqueRoutes } from "@/lib/cruise-search/unique-routes";
import MobileHorizontalScroll from "./MobileHorizontalScroll";
import UniqueRouteCard from "./UniqueRouteCard";

export default async function UniqueRoutes() {
  const routes = await getUniqueRoutes();

  return (
    <section id="unique-routes" className="section-frame">
      <div className="overflow-hidden rounded-shell bg-[color:var(--color-brand)] py-14 text-white sm:py-20 lg:rounded-shell-lg lg:py-24">
        <div className="container-px mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-caption font-semibold text-[color:var(--color-brand)]">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]"
                  aria-hidden
                />
                Унікальні маршрути
              </span>
            </div>
            <div>
              <h2 className="text-h2 text-white">
                Маршрути поза звичними сценаріями
              </h2>
              <p className="type-section-lead mt-4 text-white/75">
                Ретельно відібрані маршрути для тих, хто шукає не стандартну
                відпустку, а особливий досвід. Більше напрямків, незвичні порти
                та подорожі, які залишаються в пам&apos;яті надовго.
              </p>
            </div>
          </div>

          {routes.length > 0 ? (
            <MobileHorizontalScroll
              tone="light"
              className="mt-14 flex items-stretch gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 snap-x snap-mandatory sm:gap-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:pb-0"
            >
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="w-[min(92vw,24rem)] shrink-0 snap-center lg:w-auto lg:min-w-0 lg:shrink"
                >
                  <UniqueRouteCard route={route} />
                </div>
              ))}
            </MobileHorizontalScroll>
          ) : (
            <p className="text-body mt-14 text-center text-white/75">
              Зараз немає доступних маршрутів для показу. Спробуйте пізніше або
              перейдіть до пошуку.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
