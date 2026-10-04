import { gsap } from "gsap";
import { prefersReducedMotion } from "./env";
import { getLenis } from "./smooth";

// Mobile nav, sticky/auto-hiding header, footer year, form success state.
export function initUI(): void {
  // year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // mobile menu
  const menuToggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
  const navLinks = document.querySelector<HTMLElement>(".nav-links");
  if (menuToggle && navLinks) {
    const mobileMenu = window.matchMedia("(max-width: 1100px)");
    const setMenuOpen = (open: boolean) => {
      if (open) document.querySelector(".site-header")?.classList.remove("is-hidden");
      navLinks.classList.toggle("is-open", open);
      menuToggle.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
      document.body.classList.toggle("nav-menu-open", open);
      if (open) getLenis()?.stop();
      else getLenis()?.start();
    };
    menuToggle.addEventListener("click", () =>
      setMenuOpen(!navLinks.classList.contains("is-open"))
    );
    navLinks.querySelectorAll("a").forEach((link) =>
      // Unlock before the smooth-scroll anchor handler runs.
      link.addEventListener("click", () => setMenuOpen(false), { capture: true })
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("is-open")) setMenuOpen(false);
    });
    mobileMenu.addEventListener("change", () => {
      if (!mobileMenu.matches && navLinks.classList.contains("is-open")) setMenuOpen(false);
    });
  }

  // header scroll state + auto-hide
  const header = document.querySelector<HTMLElement>(".site-header");
  if (header) {
    let lastY = 0;
    const update = (y: number) => {
      header.classList.toggle("is-scrolled", y > 12);
      const goingDown = y > lastY && y > 240;
      header.classList.toggle("is-hidden", goingDown && !document.body.classList.contains("nav-menu-open"));
      lastY = y;
    };
    const lenis = getLenis();
    if (lenis) {
      lenis.on("scroll", ({ scroll }: { scroll: number }) => update(scroll));
    } else {
      window.addEventListener("scroll", () => update(window.scrollY), { passive: true });
    }
    update(window.scrollY);
  }

  // contact form success
  if (window.location.search.indexOf("sent=1") !== -1) {
    const form = document.querySelector<HTMLFormElement>(".contact-form");
    if (form && form.parentNode) {
      const thanks = document.createElement("div");
      thanks.className = "form-thanks";
      thanks.innerHTML =
        "<strong>Bedankt voor uw aanvraag.</strong><br />We nemen binnen 24u contact met u op.";
      form.parentNode.insertBefore(thanks, form);
      form.style.display = "none";
      if (!prefersReducedMotion()) {
        gsap.from(thanks, { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" });
      }
      thanks.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        history.replaceState({}, "", window.location.pathname);
      } catch {
        /* noop */
      }
    }
  }
}
