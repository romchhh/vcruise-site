import Footer from "./Footer";
import Header from "./Header";

export default function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header forceSolid />
      <main className="bg-background pb-16 pt-28 sm:pt-32">
        <div className="section-frame">
          <div className="container-px mx-auto max-w-[800px]">
            <span className="section-badge">Юридична інформація</span>
            <h1 className="text-h2 mt-5 text-[color:var(--color-black)]">
              {title}
            </h1>
            <p className="text-caption mt-4 text-subtitle">
              Останнє оновлення: {updatedAt}
            </p>

            <div className="mt-10 space-y-8">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-h4 font-bold text-[color:var(--color-black)]">
        {title}
      </h2>
      <div className="text-body mt-3 space-y-3 text-subtitle">{children}</div>
    </section>
  );
}
