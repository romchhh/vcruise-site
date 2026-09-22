import { getNearestCruises } from "@/lib/cruise-search/nearest-cruises";
import CruiseCard from "./CruiseCard";

export default async function NearestCruises() {
  const nearestCruises = await getNearestCruises();

  return (
    <section id="nearest-cruises" className="bg-background py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Найближчі круїзи</span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              Ваш наступний маршрут може бути тут
            </h2>
            <p className="text-body text-subtitle mt-4">
              Добірка актуальних круїзів на найближчі дати від провідних
              компаній. Кожна картка — окремий оператор і його найближчий
              відправлення у Середземномор&apos;ї, оновлюється автоматично.
            </p>
          </div>
        </div>

        {nearestCruises.length > 0 ? (
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {nearestCruises.map((cruise) => (
              <CruiseCard key={cruise.id} cruise={cruise} />
            ))}
          </div>
        ) : (
          <p className="text-body text-subtitle mt-14 text-center">
            Зараз немає доступних круїзів для показу. Спробуйте пізніше або
            перейдіть до пошуку.
          </p>
        )}
      </div>
    </section>
  );
}
