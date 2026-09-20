import { nearestCruises } from "@/data/cruises";
import CruiseCard from "./CruiseCard";

export default function NearestCruises() {
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
              Ваш наступний маршрут уже може бути тут. Добірка актуальних
              круїзів на найближчі дати. Обирайте напрямок, лайнер або формат
              подорожі — а ми допоможемо розібратися в деталях і підібрати
              найкращий варіант.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {nearestCruises.map((cruise) => (
            <CruiseCard key={cruise.id} cruise={cruise} />
          ))}
        </div>
      </div>
    </section>
  );
}
