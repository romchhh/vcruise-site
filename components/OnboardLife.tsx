import Image from "next/image";
import { onboardFeatures } from "@/data/onboard";

export default function OnboardLife() {
  return (
    <section id="onboard-life" className="bg-background py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Життя на борту</span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              Круїз — це більше, ніж подорож між містами
            </h2>
            <p className="type-section-lead text-subtitle mt-4">
              Поки за вікном змінюються країни та океани, на борту починається
              окрема історія.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {onboardFeatures.map((feature) => (
            <div
              key={feature.id}
              className="group relative aspect-[3/4.5] min-w-0 overflow-hidden rounded-card sm:aspect-[3/4]"
            >
              <Image
                src={feature.image}
                alt={feature.title}
                fill
                className="object-cover object-[center_45%] scale-[1.04] transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-5">
                <h3 className="type-card-title text-white">
                  {feature.title}
                </h3>
                <p className="type-card-meta mt-1 line-clamp-2 text-white/75">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
