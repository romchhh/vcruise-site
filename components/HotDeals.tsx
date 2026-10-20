import { getHotDeals } from "@/lib/cruise-search/hot-deals";
import { loadClientCruises } from "@/lib/cruise-search/load-cruises";
import { cmsBlock } from "@/lib/cms/content";
import { resolveHotDeals } from "@/lib/cms/section-items";
import HotDealCard from "./HotDealCard";
import MobileHorizontalScroll from "./MobileHorizontalScroll";

export default async function HotDeals() {
  const block = cmsBlock("hot-deals");
  const deals = resolveHotDeals(
    block,
    await getHotDeals(),
    loadClientCruises(),
  );

  return (
    <section id="hot-deals" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">
              {block?.badge || "Найкращі пропозиції"}
            </span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              {block?.title || "Найближчі маршрути за спеціальною ціною"}
            </h2>
            <p className="type-section-lead text-subtitle mt-4">
              {block?.description ||
                "Зібрали найближчі круїзи зі спеціальними цінами в одному місці. Обирайте маршрут, який підходить за датами, напрямком і бюджетом, — а про решту подбаємо ми."}
            </p>
          </div>
        </div>

        {deals.length > 0 ? (
          <MobileHorizontalScroll
            className="mt-14 flex items-stretch gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 snap-x snap-mandatory sm:gap-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:pb-0"
          >
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="w-[min(92vw,24rem)] shrink-0 snap-center lg:w-auto lg:min-w-0 lg:shrink"
              >
                <HotDealCard deal={deal} />
              </div>
            ))}
          </MobileHorizontalScroll>
        ) : (
          <p className="text-body text-subtitle mt-14 text-center">
            Зараз немає акційних пропозицій. Перегляньте пошук круїзів або
            зв&apos;яжіться з нами — підберемо вигідний варіант.
          </p>
        )}
      </div>
    </section>
  );
}
