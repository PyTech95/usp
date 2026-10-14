import { useEffect } from "react";

// Curated block-level targets that should "open" left-to-right as they scroll into view.
const SELECTORS = [
  ".hero-text", ".prose", ".lede", ".eyebrow", ".photo", ".aside-statement",
  ".hero-actions", ".invite-inner", ".work-card", ".note-card", ".note-item",
  ".collage", ".area-strip", ".split-text", ".image-body", ".pull-quote",
  ".mosaic", ".gallery", ".h1", ".h2", ".h3",
];

export function useScrollReveal(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const scope = document.querySelector("main");
    if (!scope) return undefined;

    // Reduced motion: never hide anything.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    // While the live editor is active, keep everything visible (don't hide for editing).
    if (document.body.classList.contains("live-editing")) {
      scope.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
      return undefined;
    }

    document.documentElement.classList.add("motion-ready");

    const targets = new Set();
    scope.querySelectorAll(".reveal").forEach((el) => targets.add(el));
    SELECTORS.forEach((sel) => scope.querySelectorAll(sel).forEach((el) => {
      el.classList.add("reveal");
      targets.add(el);
    }));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    targets.forEach((el) => io.observe(el));

    // Safety net: if anything is missed, reveal it after a short while.
    const t = setTimeout(() => targets.forEach((el) => el.classList.add("in-view")), 2600);

    return () => { io.disconnect(); clearTimeout(t); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
