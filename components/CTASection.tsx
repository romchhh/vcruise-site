import Image from "next/image";

export default function CTASection() {
  return (
    <section className="bg-background py-20 lg:py-24">
      <div className="container-px mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-card">
            <Image
              src="/images/cta-ship.jpg"
              alt="Круїзний лайнер біля причалу"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 45vw, 320px"
            />
          </div>
          <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-card sm:mt-14">
            <Image
              src="/images/cta-deck.jpg"
              alt="Вид на океан з палуби круїзного лайнера"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 45vw, 320px"
            />
          </div>
        </div>

        <div>
          <span className="section-badge">Ви подорожуєте</span>

          <h2 className="text-h2 mt-6 text-[color:var(--color-black)]">
            Ми подбаємо про все інше
          </h2>

          <p className="text-body text-subtitle mt-4 max-w-md">
            Від вибору маршруту та каюти до документів, екскурсій і підтримки
            під час подорожі.
          </p>

          <a href="#cruise-finder" className="btn-primary mt-8">
            Підібрати круїз
          </a>
        </div>
      </div>
    </section>
  );
}
