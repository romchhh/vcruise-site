import Image from "next/image";
import { cmsBlock } from "@/lib/cms/content";

export default function CTASection() {
  const block = cmsBlock("cta");
  const images =
    block?.images && block.images.length >= 2
      ? block.images
      : ["/images/cta-ship.jpg", "/images/cta-deck.jpg"];
  const alts = [
    "Круїзний лайнер біля причалу",
    "Вид на океан з палуби круїзного лайнера",
  ];

  return (
    <section className="bg-background py-20 lg:py-24">
      <div className="container-px mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {images.slice(0, 2).map((src, index) => (
            <div
              key={src}
              className={`relative aspect-[3/4] overflow-hidden rounded-card ${
                index === 1 ? "mt-10 sm:mt-14" : ""
              }`}
            >
              <Image
                src={src}
                alt={alts[index] || block?.imageAlt || ""}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 45vw, 320px"
                unoptimized={src.startsWith("/api/media/")}
              />
            </div>
          ))}
        </div>

        <div className="text-center lg:text-left">
          <span className="section-badge">
            {block?.badge || "Ви подорожуєте"}
          </span>

          <h2 className="text-h2 mt-6 text-[color:var(--color-black)]">
            {block?.title || "Ми подбаємо про все інше"}
          </h2>

          <p className="type-section-lead text-subtitle mx-auto mt-4 max-w-md lg:mx-0">
            {block?.description ||
              "Від вибору маршруту та каюти до документів, екскурсій і підтримки під час подорожі."}
          </p>

          <a
            href={block?.ctaHref || "#cruise-finder"}
            className="btn-primary mt-8"
          >
            {block?.ctaLabel || "Підібрати круїз"}
          </a>
        </div>
      </div>
    </section>
  );
}
