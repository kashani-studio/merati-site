import { gsap, ScrollTrigger } from "./gsap";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "./env";

gsap.registerPlugin(SplitText);

// Headline animation: split into lines/words and stagger them in as the
// element scrolls into view. Falls back to a simple fade if SplitText is
// unavailable for any reason — the heading must always end up visible.
function initHeadlines(): void {
  const heads = gsap.utils.toArray<HTMLElement>("[data-anim='heading']");
  heads.forEach((el) => {
    try {
      const split = new SplitText(el, {
        type: "words",
      });
      gsap.set(el, { opacity: 1 });
      gsap.from(split.words, {
        y: 24,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
        stagger: 0.035,
        // Restore plain text so no animation wrappers can constrain the glyphs.
        onComplete: () => split.revert(),
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    } catch (err) {
      console.warn("[motion] SplitText fallback (heading):", err);
      gsap.set(el, { opacity: 1 });
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    }
  });
}

// Generic fade/rise reveal for blocks, cards, images.
function initReveals(): void {
  const items = gsap.utils.toArray<HTMLElement>("[data-anim='reveal']");
  items.forEach((el) => {
    const delay = parseFloat(el.getAttribute("data-delay") || "0");
    gsap.from(el, {
      y: 48,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      delay,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });
}

// Clip-path image reveal — the mason's "uncover" effect.
function initClipReveals(): void {
  const items = gsap.utils.toArray<HTMLElement>("[data-anim='clip']");
  items.forEach((el) => {
    const img = el.querySelector("img");
    gsap.fromTo(
      el,
      { clipPath: "inset(0 0 100% 0)" },
      {
        clipPath: "inset(0 0 0% 0)",
        duration: 1.3,
        ease: "power4.inOut",
        scrollTrigger: { trigger: el, start: "top 85%" },
      }
    );
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.3 },
        {
          scale: 1,
          duration: 1.4,
          ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        }
      );
    }
  });
}

// Number count-up for stats.
function initCounters(): void {
  const els = gsap.utils.toArray<HTMLElement>("[data-count]");
  els.forEach((el) => {
    const target = parseFloat(el.getAttribute("data-count") || "0");
    const suffix = el.getAttribute("data-count-suffix") || "";
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => {
        el.textContent = Math.round(obj.val) + suffix;
      },
    });
  });
}

// Subtle parallax on flagged elements.
function initParallax(): void {
  const els = gsap.utils.toArray<HTMLElement>("[data-parallax]");
  els.forEach((el) => {
    const depth = parseFloat(el.getAttribute("data-parallax") || "0.15");
    gsap.to(el, {
      yPercent: -depth * 100,
      ease: "none",
      scrollTrigger: {
        trigger: el.parentElement || el,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });
}

export function initReveal(): void {
  if (prefersReducedMotion()) {
    // Make sure everything is visible without motion.
    document
      .querySelectorAll<HTMLElement>("[data-anim]")
      .forEach((el) => gsap.set(el, { opacity: 1, clearProps: "all" }));
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const t = el.getAttribute("data-count");
      const suffix = el.getAttribute("data-count-suffix") || "";
      if (t) el.textContent = t + suffix;
    });
    return;
  }

  const steps: Array<[string, () => void]> = [
    ["headlines", initHeadlines],
    ["reveals", initReveals],
    ["clip", initClipReveals],
    ["counters", initCounters],
    ["parallax", initParallax],
  ];
  steps.forEach(([name, fn]) => {
    try {
      fn();
    } catch (err) {
      console.warn(`[motion] reveal step "${name}" failed:`, err);
    }
  });

  // Recalculate once fonts/images settle.
  requestAnimationFrame(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
