"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ADMIN_TOUR_STEPS,
  type AdminTourStep,
  type TourPlacement,
} from "@/lib/admin/tour-steps";
import styles from "./AdminTour.module.css";

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_GAP = 14;
const DEFAULT_PATH = "/admin/dashboard";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function findVisibleTourTarget(targetId: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-tour="${targetId}"]`
  );
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") continue;
    return node;
  }
  return nodes[0] ?? null;
}

function measureTarget(targetId?: string): Rect | null {
  if (!targetId) return null;
  const el = findVisibleTourTarget(targetId);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function tooltipPosition(
  target: Rect | null,
  placement: TourPlacement,
  tooltipSize: { width: number; height: number }
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const w = tooltipSize.width;
  const h = tooltipSize.height;

  if (!target || placement === "center") {
    return {
      top: Math.max(margin, (vh - h) / 2),
      left: Math.max(margin, (vw - w) / 2),
    };
  }

  let top = target.top + target.height + TOOLTIP_GAP;
  let left = target.left + target.width / 2 - w / 2;

  if (placement === "top") {
    top = target.top - h - TOOLTIP_GAP;
  } else if (placement === "left") {
    top = target.top + target.height / 2 - h / 2;
    left = target.left - w - TOOLTIP_GAP;
  } else if (placement === "right") {
    top = target.top + target.height / 2 - h / 2;
    left = target.left + target.width + TOOLTIP_GAP;
  }

  top = Math.min(Math.max(margin, top), vh - h - margin);
  left = Math.min(Math.max(margin, left), vw - w - margin);
  return { top, left };
}

async function waitForTarget(
  targetId: string,
  timeoutMs = 3500
): Promise<boolean> {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (findVisibleTourTarget(targetId)) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

type Props = {
  onComplete: () => void;
  onSkip?: () => void;
};

export default function AdminTour({ onComplete, onSkip }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [stepReady, setStepReady] = useState(false);

  const steps = ADMIN_TOUR_STEPS;
  const step: AdminTourStep = steps[stepIndex];
  const stepPath = step.path ?? DEFAULT_PATH;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const placement = step.placement ?? (step.target ? "bottom" : "center");
  const progressPct = ((stepIndex + 1) / steps.length) * 100;

  const refreshGeometry = useCallback(() => {
    const targetId = step.target;
    if (targetId) {
      const el = findVisibleTourTarget(targetId);
      el?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    window.requestAnimationFrame(() => {
      const rect = measureTarget(targetId);
      setTargetRect(rect);

      const tooltipEl = document.getElementById("admin-tour-tooltip");
      const size = tooltipEl
        ? { width: tooltipEl.offsetWidth, height: tooltipEl.offsetHeight }
        : { width: 400, height: 320 };
      setTooltipPos(tooltipPosition(rect, placement, size));
    });
  }, [step.target, placement]);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (pathname === stepPath) return;
    router.push(stepPath);
  }, [pathname, router, stepPath]);

  useEffect(() => {
    let cancelled = false;
    const prepareId = window.setTimeout(() => {
      void (async () => {
        setStepReady(false);
        setTargetRect(null);

        if (pathname !== stepPath) return;

        await new Promise((r) => setTimeout(r, 280));
        if (cancelled) return;

        if (step.target) {
          await waitForTarget(step.target);
        }
        if (cancelled) return;
        setStepReady(true);
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(prepareId);
    };
  }, [pathname, stepPath, step.target, stepIndex]);

  useLayoutEffect(() => {
    if (!stepReady) return;
    refreshGeometry();
    const onResize = () => refreshGeometry();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [refreshGeometry, stepReady, stepIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goNext = useCallback(() => {
    if (isLast) onComplete();
    else setStepIndex((i) => i + 1);
  }, [isLast, onComplete]);

  const goBack = useCallback(
    () => setStepIndex((i) => Math.max(0, i - 1)),
    []
  );

  const handleSkip = useCallback(() => {
    if (onSkip) onSkip();
    else onComplete();
  }, [onComplete, onSkip]);

  useEffect(() => {
    if (!stepReady) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepReady, goNext, goBack, handleSkip, isFirst]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-tour-title"
    >
      <div className={styles.scrim} aria-hidden />

      {stepReady && targetRect ? (
        <div
          className={styles.spotlight}
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      ) : null}

      <div
        id="admin-tour-tooltip"
        className={`${styles.tooltip} ${!stepReady ? styles.tooltipHidden : ""}`}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className={styles.body}>
          <div className={styles.metaRow}>
            <div style={{ minWidth: 0 }}>
              <span className={styles.stepLabel}>
                Крок {stepIndex + 1} з {steps.length}
              </span>
              {step.section ? (
                <span className={styles.sectionLabel}>{step.section}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className={styles.escBtn}
              aria-label="Закрити тур"
            >
              Esc
            </button>
          </div>

          <h2 id="admin-tour-title" className={styles.title}>
            {step.title}
          </h2>
          <p className={styles.description}>{step.description}</p>

          {step.action ? (
            <p className={styles.actionBanner}>
              <span className={styles.actionTag}>Зробіть так</span>
              {step.action}
            </p>
          ) : null}

          {step.tips && step.tips.length > 0 ? (
            <div className={styles.tips}>
              <p className={styles.tipsTitle}>Поради</p>
              <ul className={styles.tipsList}>
                {step.tips.map((tip, tipIndex) => (
                  <li key={tip}>
                    <span className={styles.tipIndex} aria-hidden>
                      {tipIndex + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <div className={styles.navRow}>
            {!isFirst ? (
              <button
                type="button"
                onClick={goBack}
                disabled={!stepReady}
                className={styles.btnSecondary}
              >
                Назад
              </button>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              disabled={!stepReady}
              className={styles.btnPrimary}
            >
              {isLast ? "Почати роботу" : "Далі"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className={styles.skipBtn}
          >
            Розберуся сам
          </button>

          <p className={styles.hint}>← → або Enter — навігація · Esc — вихід</p>

          <div className={styles.dots}>
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Перейти до кроку ${i + 1}: ${s.title}`}
                disabled={!stepReady}
                onClick={() => setStepIndex(i)}
                className={
                  i === stepIndex
                    ? styles.dotActive
                    : i < stepIndex
                      ? styles.dotDone
                      : styles.dot
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
