import Image from "next/image";
import { aboutFeatures } from "@/data/about";
import { AboutFeature } from "@/types";

function AboutFeatureCard({ feature }: { feature: AboutFeature }) {
  return (
    <article className="overflow-hidden rounded-card-inner bg-white">
      <div className="flex items-center justify-center px-5 py-6">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-icon)] bg-[color:var(--color-brand-light)]"
        >
          <Image
            src={feature.icon}
            alt=""
            width={29}
            height={29}
            className="h-7 w-7 object-contain"
            aria-hidden
          />
        </div>
      </div>

      <div className="divider" />

      <div className="px-5 py-5">
        <h3 className="text-h4 font-bold text-[color:var(--color-black)]">
          {feature.title}
        </h3>
        <p className="text-caption text-subtitle mt-2 leading-relaxed">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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
