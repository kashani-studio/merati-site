// Central feature-detection + environment guards for the motion layer.
// Everything degrades gracefully: if any check fails, we ship the static,
// fully-readable HTML with no animation.

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none), (pointer: coarse)").matches;

export const isSmallScreen = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;

let webglCache: boolean | null = null;
export const supportsWebGL = (): boolean => {
  if (webglCache !== null) return webglCache;
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    webglCache = Boolean(gl);
  } catch {
    webglCache = false;
  }
  return webglCache;
};

// Heavy/3D motion only when it is genuinely a good idea.
export const allowHeavyMotion = (): boolean =>
  // The renderer checks its real context; don't allocate a throwaway one first.
  !prefersReducedMotion() && !isSmallScreen();

export const onReady = (fn: () => void): void => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
};
