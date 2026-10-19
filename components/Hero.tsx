import Image from "next/image";
import HeroSearch from "./HeroSearch";
import { cmsBlock } from "@/lib/cms/content";

export default function Hero() {
  const block = cmsBlock("hero");
  const title = block?.title || "Відкрийте океан";
  const titleLine2 = block?.titleLine2 || "можливостей";
  const description =
    block?.description ||
    "Подорожуйте без зайвих турбот – ми будемо поруч на кожному етапі.";
  const image = block?.image || "/images/hero.jpg";
  const imageAlt = block?.imageAlt || "Круїзний лайнер на заході сонця";

  return (
    <section className="section-frame">
      <div className="relative flex min-h-[calc(100svh-1rem)] flex-col overflow-visible rounded-shell md:min-h-[calc(100svh-1.25rem)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-shell">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            unoptimized={image.startsWith("/api/media/")}
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="container-px relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center pt-28 text-center sm:pt-32 lg:pt-36">
          <h1 className="text-h1 max-w-[900px] text-white">
            {title}
            {titleLine2 ? (
              <>
                <br />
                {titleLine2}
              </>
            ) : null}
          </h1>
          <p className="type-section-lead mt-5 max-w-[540px] text-white/90">
            {description}
          </p>
        </div>

        <HeroSearch />
      </div>
    </section>
  );
}
