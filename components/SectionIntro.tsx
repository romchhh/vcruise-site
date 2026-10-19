import type { ContentBlock } from "@/lib/cms/store";

type SectionIntroProps = {
  block?: ContentBlock | null;
  fallbackBadge: string;
  fallbackTitle: string;
  fallbackDescription: string;
  /** Dark section (unique-routes style) uses a white pill badge instead. */
  tone?: "default" | "brand";
};

export default function SectionIntro({
  block,
  fallbackBadge,
  fallbackTitle,
  fallbackDescription,
  tone = "default",
}: SectionIntroProps) {
  const badge = block?.badge || fallbackBadge;
  const title = block?.title || fallbackTitle;
  const description = block?.description || fallbackDescription;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-16">
      <div>
        {tone === "brand" ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-caption font-semibold text-[color:var(--color-brand)]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand)]"
              aria-hidden
            />
            {badge}
          </span>
        ) : (
          <span className="section-badge">{badge}</span>
        )}
      </div>
      <div>
        <h2
          className={`text-h2 ${
            tone === "brand" ? "text-white" : "text-[color:var(--color-black)]"
          }`}
        >
          {title}
        </h2>
        <p
          className={`type-section-lead mt-4 ${
            tone === "brand"
              ? "text-white/75"
              : "max-w-xl leading-relaxed text-subtitle"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
