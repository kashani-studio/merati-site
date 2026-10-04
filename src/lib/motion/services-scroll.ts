import { gsap, ScrollTrigger } from "./gsap";

// Pin the services section and translate the track horizontally as the user
// scrolls vertically. On small screens / reduced-motion we leave the native
// vertical (or scroll-snap) layout untouched.
export function initServicesScroll(): void {
  const section = document.querySelector<HTMLElement>("[data-services]");
  const track = document.querySelector<HTMLElement>("[data-services-track]");
  if (!section || !track) return;

  const media = gsap.matchMedia();
  media.add({
    desktop: "(min-width: 861px)",
    mobile: "(max-width: 860px)",
    reduce: "(prefers-reduced-motion: reduce)",
  }, (context) => {
    const { desktop, reduce } = context.conditions!;
    if (!desktop || reduce) {
      section.classList.add("services--stacked");
      return () => { section.classList.remove("services--stacked"); };
    }
    section.classList.remove("services--stacked");

    const getScrollDistance = () => track.scrollWidth - window.innerWidth;

    // Avoid retaining every full-size service photo as a GPU layer offscreen.
    const layers = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        (entry.target as HTMLElement).style.willChange = entry.isIntersecting ? "transform" : "auto";
      });
    }, { rootMargin: "100px" });
    track.style.willChange = "auto";
    layers.observe(track);

    const tween = gsap.to(track, {
      x: () => -getScrollDistance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${getScrollDistance() + window.innerHeight * 0.4}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    // Per-card parallax on the imagery as panels move through the viewport.
    gsap.utils.toArray<HTMLElement>("[data-service-card]").forEach((card) => {
      const img = card.querySelector<HTMLElement>(".service-card-img");
      if (!img) return;
      img.style.willChange = "auto";
      layers.observe(img);
      gsap.fromTo(
        img,
        { scale: 1.18, xPercent: -4 },
        {
          // A 4% pan needs at least 8% overscan to keep both edges covered.
          scale: 1.1,
          xPercent: 4,
          force3D: false,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            containerAnimation: tween,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        }
      );
    });

    // progress bar
    const bar = section.querySelector<HTMLElement>("[data-services-progress]");
    if (bar) {
      gsap.to(bar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollDistance() + window.innerHeight * 0.4}`,
          scrub: true,
        },
      });
    }

    ScrollTrigger.refresh();
    return () => {
      layers.disconnect();
      track.style.removeProperty("will-change");
      track.querySelectorAll<HTMLElement>(".service-card-img").forEach((img) => img.style.removeProperty("will-change"));
    };
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) media.revert();
  });
}
