import { allowHeavyMotion } from "./env";
import { heroFragmentShader } from "./hero-shader";

// Same shader, texture and resolution; a full-screen quad needs no 3D engine.
export async function initHeroWebGL(): Promise<void> {
  const mount = document.querySelector<HTMLElement>("[data-hero-canvas]");
  const src = mount?.getAttribute("data-hero-src");
  if (!mount || !src || !allowHeavyMotion()) return;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  try { await image.decode(); } catch { return; }
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: false, depth: false, stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return;
  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Cannot create hero shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error || "Cannot compile hero shader");
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, `
    attribute vec2 position;
    varying vec2 vUv;
    void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
  `);
  const fragment = compile(gl.FRAGMENT_SHADER, heroFragmentShader);
  const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture();
  if (!program || !buffer || !texture) {
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    gl.deleteProgram(program); gl.deleteBuffer(buffer); gl.deleteTexture(texture);
    return;
  }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program); gl.deleteBuffer(buffer); gl.deleteTexture(texture);
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const time = uniform("uTime"), mouse = uniform("uMouse"), hover = uniform("uHover"), screen = uniform("uScreenRes");
  gl.uniform1i(uniform("uTexture"), 0);
  gl.uniform2f(uniform("uImgRes"), image.naturalWidth, image.naturalHeight);
  // Match THREE.Color's conversion of the existing navy tint to linear RGB.
  const linear = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  gl.uniform3f(uniform("uTint"), linear(10/255), linear(31/255), linear(68/255));
  canvas.className = "hero-gl";
  mount.appendChild(canvas);
  let width = 1, height = 1;
  const resize = () => {
    width = mount.clientWidth || innerWidth; height = mount.clientHeight || innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.floor(width * ratio); canvas.height = Math.floor(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(screen, width, height);
  };
  resize();
  const sizes = new ResizeObserver(resize);
  sizes.observe(mount);
  let targetX = 0.5, targetY = 0.5, mouseX = 0.5, mouseY = 0.5, hoverTarget = 0, hoverValue = 0;
  let pointer: PointerEvent | null = null;
  const move = (event: PointerEvent) => { pointer = event; hoverTarget = 1; };
  const leave = () => { hoverTarget = 0; pointer = null; };
  mount.addEventListener("pointermove", move, { passive: true });
  mount.addEventListener("pointerleave", leave);
  const start = performance.now();
  let previous = start, lastDraw = 0, raf = 0, inView = false, away = false, disposed = false;
  // Only this subtle background is capped at 30fps. Scroll/text stay untouched.
  const interval = 1000 / 30;
  const render = (now: number) => {
    raf = 0;
    if (disposed || away || !inView || document.hidden) return;
    if (now - lastDraw >= interval - 0.5) {
      const delta = Math.min(now - previous, 100);
      previous = now; lastDraw = now;
      if (pointer) {
        const rect = mount.getBoundingClientRect();
        targetX = (pointer.clientX - rect.left) / width;
        targetY = 1 - (pointer.clientY - rect.top) / height;
        pointer = null;
      }
      const follow = 1 - 0.94 ** (delta / (1000 / 60));
      mouseX += (targetX - mouseX) * follow; mouseY += (targetY - mouseY) * follow;
      hoverValue += (hoverTarget - hoverValue) * (1 - 0.95 ** (delta / (1000 / 60)));
      gl.uniform1f(time, (now - start) / 1000);
      gl.uniform2f(mouse, mouseX, mouseY); gl.uniform1f(hover, hoverValue);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    raf = requestAnimationFrame(render);
  };
  const sync = () => {
    if (disposed) return;
    const active = inView && !document.hidden && !away;
    if (active && !raf) { previous = performance.now(); raf = requestAnimationFrame(render); }
    else if (!active && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting; sync();
  }, { threshold: 0.01 });
  visibility.observe(mount);
  document.addEventListener("visibilitychange", sync);
  const hide = (event: PageTransitionEvent) => { away = true; sync(); if (!event.persisted) dispose(); };
  const show = () => { away = false; sync(); };
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf);
    sizes.disconnect(); visibility.disconnect();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show);
    mount.removeEventListener("pointermove", move); mount.removeEventListener("pointerleave", leave);
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
    canvas.remove(); mount.classList.remove("hero-gl-ready");
  };
  canvas.addEventListener("webglcontextlost", dispose, { once: true });
  window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
  // Paint before hiding the existing CSS fallback.
  gl.uniform1f(time, 0); gl.uniform2f(mouse, 0.5, 0.5); gl.uniform1f(hover, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  mount.classList.add("hero-gl-ready");
}
