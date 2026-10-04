import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "./env";

gsap.registerPlugin(SplitText);

// Hero entrance timeline (runs on load, after the preloader).
export function playHeroIntro(): Promise<void> {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return Promise.resolve();

  if (prefersReducedMotion()) {
    hero.querySelectorAll<HTMLElement>("[data-hero-stagger]").forEach((el) =>
      gsap.set(el, { opacity: 1 })
    );
    const t = hero.querySelector<HTMLElement>("[data-hero-title]");
    if (t) gsap.set(t, { opacity: 1 });
    return Promise.resolve();
  }

  const title = hero.querySelector<HTMLElement>("[data-hero-title]");
  let complete!: () => void;
  const finished = new Promise<void>((resolve) => { complete = resolve; });
  const tl = gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: complete });

  if (title) {
    gsap.set(title, { opacity: 1 });
    try {
      // Keep natural line wrapping, including while fonts load or widths change.
      const split = new SplitText(title, { type: "words" });
      tl.from(split.words, {
        y: 24,
        opacity: 0,
        duration: 1.1,
        stagger: 0.06,
        onComplete: () => split.revert(),
      });
    } catch (err) {
      console.warn("[motion] SplitText fallback (hero):", err);
      tl.from(title, { y: 40, opacity: 0, duration: 1.1 });
    }
  }

  const stagger = hero.querySelectorAll<HTMLElement>("[data-hero-stagger]");
  gsap.set(stagger, { opacity: 1 });
  tl.from(
    stagger,
    { y: 30, opacity: 0, duration: 0.9, stagger: 0.12 },
    title ? "-=0.6" : 0
  );

  const cue = hero.querySelector<HTMLElement>("[data-hero-cue]");
  if (cue) {
    const animation = gsap.to(cue, { y: 10, repeat: -1, yoyo: true, duration: 1.2, ease: "sine.inOut" });
    let inView = true;
    const sync = () => animation.paused(!inView || document.hidden);
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    visibility.observe(cue);
    document.addEventListener("visibilitychange", sync);
    sync();
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) {
        visibility.disconnect();
        document.removeEventListener("visibilitychange", sync);
        animation.kill();
      }
    });
  }
  return finished;
}
