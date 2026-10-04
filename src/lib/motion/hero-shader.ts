export const heroFragmentShader = /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uHover;
      uniform vec2 uImgRes;
      uniform vec2 uScreenRes;
      uniform vec3 uTint;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

      void main() {
        // cover-fit the texture
        float screenAspect = uScreenRes.x / uScreenRes.y;
        float imgAspect = uImgRes.x / uImgRes.y;
        vec2 ratio = vec2(
          min(screenAspect / imgAspect, 1.0),
          min(imgAspect / screenAspect, 1.0)
        );
        vec2 uv = vec2(
          (vUv.x - 0.5) * (imgAspect < screenAspect ? 1.0 : ratio.x) + 0.5,
          (vUv.y - 0.5) * (imgAspect < screenAspect ? ratio.y / (ratio.x) * (screenAspect/imgAspect) : 1.0) + 0.5
        );
        // simpler robust cover
        vec2 cuv = (vUv - 0.5);
        if (screenAspect > imgAspect) {
          cuv.y *= imgAspect / screenAspect;
        } else {
          cuv.x *= screenAspect / imgAspect;
        }
        cuv += 0.5;

        // cursor ripple
        float d = distance(vUv, uMouse);
        float ripple = sin(d * 22.0 - uTime * 2.2) * 0.0035 * uHover;
        ripple += sin(d * 9.0 - uTime * 1.1) * 0.002;
        vec2 dir = normalize(cuv - uMouse + 0.0001);
        vec2 disp = dir * ripple;

        // slow ambient drift
        disp += vec2(
          sin(uTime * 0.12 + cuv.y * 3.0) * 0.0015,
          cos(uTime * 0.1 + cuv.x * 3.0) * 0.0015
        );

        vec3 col = texture2D(uTexture, cuv + disp).rgb;

        // navy grade: push shadows toward brand navy, keep highlights
        col = mix(col * uTint * 2.0, col, 0.55);
        col = mix(col, uTint, 0.18);

        // radial vignette
        float vig = smoothstep(1.15, 0.35, distance(vUv, vec2(0.5)));
        col *= mix(0.55, 1.05, vig);

        // subtle glow toward cursor
        col += (1.0 - smoothstep(0.0, 0.4, d)) * 0.06 * uHover;

        // film grain
        float g = hash(vUv * uScreenRes + uTime) - 0.5;
        col += g * 0.035;

        gl_FragColor = vec4(col, 1.0);
      }
    `;
