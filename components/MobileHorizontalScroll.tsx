"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";

type MobileHorizontalScrollProps = {
  children: ReactNode;
  /** Класи на скрол-контейнер (flex/grid, gap, тощо) */
  className?: string;
  hint?: string;
  /** light — білий текст/кнопки на темному фоні */
  tone?: "light" | "dark";
};

export default function MobileHorizontalScroll({
  children,
  className = "",
  hint = "Гортайте вліво чи вправо, щоб побачити більше",
  tone = "dark",
}: MobileHorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [thumbStyle, setThumbStyle] = useState({ widthPercent: 100, leftPercent: 0 });

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const overflow = maxScroll > 4;
    const scrollWidth = element.scrollWidth;

    setHasOverflow(overflow);
    setCanScrollLeft(element.scrollLeft > 4);
    setCanScrollRight(element.scrollLeft < maxScroll - 4);

    if (overflow && scrollWidth > 0) {
      setThumbStyle({
        widthPercent: (element.clientWidth / scrollWidth) * 100,
        leftPercent: (element.scrollLeft / scrollWidth) * 100,
      });
    } else {
      setThumbStyle({ widthPercent: 100, leftPercent: 0 });
    }
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, children]);

  const scrollByPage = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;

    const distance = Math.max(element.clientWidth * 0.88, 240);
    element.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  const hintClass =
    tone === "light" ? "text-white/75" : "text-subtitle";
  const arrowClass =
    tone === "light"
      ? "border-white/25 bg-white/15 text-white hover:bg-white/25 disabled:opacity-35"
      : "border-[color:var(--color-line)] bg-white text-[color:var(--color-black)] hover:bg-[color:var(--color-surface-muted)] disabled:opacity-40";
  const trackClass =
    tone === "light" ? "bg-white/20" : "bg-[color:var(--color-line)]";
  const thumbClass =
    tone === "light" ? "bg-white" : "bg-[color:var(--color-brand)]";
  const edgeFadeClass =
    tone === "light"
      ? "from-[color:var(--color-brand)] via-[color:var(--color-brand)]/70"
      : "from-[var(--background)] via-[var(--background)]/85";

  return (
    <div className="relative">
      <div className="relative lg:static">
        {hasOverflow && canScrollRight ? (
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l to-transparent sm:w-14 lg:hidden ${edgeFadeClass}`}
            aria-hidden
          />
        ) : null}

        <div
          ref={scrollRef}
          className={`horizontal-scroll-strip ${className}`}
        >
          {children}
        </div>
      </div>

      {hasOverflow ? (
        <div className="mt-3 space-y-3 lg:hidden">
          <div
            className={`relative h-1 overflow-hidden rounded-full ${trackClass}`}
            role="presentation"
            aria-hidden
          >
            <div
              className={`absolute top-0 h-full rounded-full transition-[left,width] duration-200 ease-out ${thumbClass}`}
              style={{
                width: `${thumbStyle.widthPercent}%`,
                left: `${thumbStyle.leftPercent}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p
              className={`flex min-w-0 items-center gap-2 text-caption leading-snug ${hintClass}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  tone === "light"
                    ? "bg-white/15 text-white"
                    : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-brand)]"
                }`}
                aria-hidden
              >
                <MoveHorizontal className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span>{hint}</span>
            </p>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Попередні картки"
                disabled={!canScrollLeft}
                onClick={() => scrollByPage(-1)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${arrowClass}`}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                aria-label="Наступні картки"
                disabled={!canScrollRight}
                onClick={() => scrollByPage(1)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${arrowClass}`}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
