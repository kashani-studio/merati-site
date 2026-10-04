import { onReady, allowHeavyMotion } from "../lib/motion/env";
import { initSmoothScroll } from "../lib/motion/smooth";
import { initGsap } from "../lib/motion/gsap";
import { initUI } from "../lib/motion/ui";
import { initReveal } from "../lib/motion/reveals";
import { initServicesScroll } from "../lib/motion/services-scroll";
import { initLightbox } from "../lib/motion/lightbox";
import { initPreloader } from "../lib/motion/preloader";
import { playHeroIntro } from "../lib/motion/hero";

// Each step is isolated: a failure in one feature must never trap the page
// (e.g. leave the preloader curtain up or block scrolling).
function safe(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[motion] ${label} failed:`, err);
  }
}

// Absolute failsafe: whatever happens, never leave the intro curtain covering
// the site for more than a moment.
function forceRevealPage(): void {
  document.body.classList.remove("is-loading");
  const pre = document.querySelector<HTMLElement>("[data-preloader]");
  if (pre) {
    pre.dataset.done = "1";
    pre.style.display = "none";
  }
}

export function initApp(): void {
  onReady(async () => {
    const failsafe = window.setTimeout(forceRevealPage, 4000);

    // Foundation first so the page is interactive regardless of extras.
    safe("smooth", () => initSmoothScroll());
    safe("gsap", () => initGsap());
    safe("ui", () => initUI());

    safe("lightbox", () => initLightbox());

    // Load the actual fonts before measuring animated text. Keep a bounded
    // fallback for visitors whose font request fails or takes too long.
    const fontsReady = new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 1500);
      document.fonts.ready.then(() => {
        window.clearTimeout(timeout);
        resolve();
      }, () => {
        window.clearTimeout(timeout);
        resolve();
      });
    });
    const curtain = Promise.resolve().then(initPreloader)
      .catch((err) => console.error("[motion] preloader failed:", err));

    // Keep the rolling words running only while their strip can be seen.
    const marquee = document.querySelector<HTMLElement>(".marquee-track");
    if (marquee) {
      let inView = false;
      const sync = () => { marquee.style.animationPlayState = inView && !document.hidden ? "running" : "paused"; };
      const visibility = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        sync();
      });
      visibility.observe(marquee);
      document.addEventListener("visibilitychange", sync);
      sync();
      window.addEventListener("pagehide", (event) => {
        if (!event.persisted) {
          visibility.disconnect();
          document.removeEventListener("visibilitychange", sync);
        }
      });
    }

    await fontsReady;
    safe("reveal", () => initReveal());
    safe("services", () => initServicesScroll());
    await curtain;
    window.clearTimeout(failsafe);
    forceRevealPage();
    await Promise.resolve().then(playHeroIntro)
      .catch((err) => console.error("[motion] hero-intro failed:", err));

    // Shader compilation and texture upload must not interrupt the text intro.
    const background = () => {
      if (allowHeavyMotion() && document.querySelector("[data-hero-canvas]")) {
        import("../lib/motion/hero-webgl")
          .then(({ initHeroWebGL }) => initHeroWebGL())
          .catch((err) => console.error("[motion] webgl failed:", err));
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(background, { timeout: 1000 });
    } else {
      window.setTimeout(background, 0);
    }
  });
}
