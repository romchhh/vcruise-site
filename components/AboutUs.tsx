import Image from "next/image";
import { aboutFeatures } from "@/data/about";
import { AboutFeature } from "@/types";

function AboutFeatureCard({ feature }: { feature: AboutFeature }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-card-inner bg-white">
      <div className="flex items-center justify-center px-3 py-4 sm:px-5 sm:py-6">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-icon)] bg-[color:var(--color-brand-light)] sm:h-12 sm:w-12"
        >
          <Image
            src={feature.icon}
            alt=""
            width={29}
            height={29}
            className="h-6 w-6 object-contain sm:h-7 sm:w-7"
            aria-hidden
          />
        </div>
      </div>

      <div className="divider" />

      <div className="px-3 py-3.5 sm:px-5 sm:py-5">
        <h3 className="type-card-title text-[color:var(--color-black)]">
          {feature.title}
        </h3>
        <p className="type-card-body text-subtitle mt-1.5 leading-relaxed sm:mt-2 sm:text-caption">
          {feature.description}
        </p>
      </div>
    </article>
  );
}

export default function AboutUs() {
  return (
    <section id="about" className="section-frame">
      <div className="relative overflow-hidden rounded-shell">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/images/about-us.jpg"
            alt="Круїзний лайнер серед зелені та гір"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/20" />
        </div>

        <div className="container-px relative z-10 mx-auto max-w-[1400px] py-12 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div>
              <span className="section-badge">Про нас</span>

              <h2 className="text-h2 mt-6 max-w-xl text-white">
                Ми знаємо круїзи не тільки з каталогів
              </h2>

              <p className="text-body mt-5 max-w-lg text-white/85">
                За нашим досвідом — робота у 4 великих круїзних туроператорах.
                За цей час ми побачили індустрію зсередини: як працюють компанії,
                що важливо клієнтам, де найчастіше виникають труднощі та що
                насправді робить подорож комфортною.
              </p>
              <p className="text-body mt-4 max-w-lg text-white/85">
                Саме тому сьогодні ми не просто продаємо круїзи. Ми допомагаємо
                організувати подорож від першого запиту до повернення додому.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-5">
              {aboutFeatures.map((feature) => (
                <AboutFeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
