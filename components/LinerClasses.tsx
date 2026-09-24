import { linerClasses } from "@/data/liner-classes";
import LinerClassCard from "./LinerClassCard";

export default function LinerClasses() {
  return (
    <section id="liners" className="bg-background py-14 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-badge">Класи лайнерів</span>
          </div>
          <div>
            <h2 className="text-h2 text-[color:var(--color-black)]">
              Оберіть свій клас лайнера
            </h2>
            <p className="text-body text-subtitle mt-4">
              Кожен лайнер — різний рівень комфорту, сервісу й формату
              відпочинку. Ми допоможемо розібратися у відмінностях і підібрати
              варіант під ваш стиль подорожі — від доступного до преміального.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {linerClasses.map((linerClass) => (
            <LinerClassCard key={linerClass.id} linerClass={linerClass} />
          ))}
        </div>
      </div>
    </section>
  );
}
