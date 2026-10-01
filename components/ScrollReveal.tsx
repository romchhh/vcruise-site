"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisabled(true);
      setVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px 0px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`scroll-reveal scroll-reveal--${direction} ${
        visible ? "scroll-reveal--visible" : ""
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
