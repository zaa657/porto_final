import React, { useRef, useEffect, useState } from 'react';

const SHAPES = { circle: 0, square: 1, ring: 2, sparkle: 3 };
const EFFECTS = { parallax: 0, repel: 1, attract: 2 };
const DRIFTS = { none: 0, up: 1, down: 2, forward: 3 };
const MAX_PARTICLES = 20000;
const MAX_BURSTS = 4;
const DEPTH_SCALE = 10;
const FOV_FACTOR = 1 / Math.tan((7.5 * Math.PI) / 180);
const NEAR_CLIP = 0.1;
const FAR_CLIP = 100;
const INTRO_DURATION = 1.8;
const BURST_DURATION = 1.5;
const BURST_SPEED = 520;
const BURST_WIDTH = 46;

const VERT_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aPosition;
layout(location = 2) in vec4 aRandom;
layout(location = 3) in vec3 aColor;
uniform mat3 uRotation;
uniform vec3 uOffset;
uniform float uSpread;
uniform float uTime;
uniform float uCamera;
uniform float uAspect;
uniform vec2 uView;
uniform float uRatio;
uniform float uSize;
uniform float uRandomness;
uniform float uBlur;
uniform float uFocus;
uniform float uGlow;
uniform float uTwinkle;
uniform int uShape;
uniform int uDrift;
uniform float uTravel;
uniform vec4 uPointer;
uniform int uEffect;
uniform float uStrength;
uniform vec4 uBursts[${MAX_BURSTS}];
uniform int uBurstCount;
uniform float uReveal;
out vec2 vLocal;
out float vRadius;
out float vBlur;
out float vAlpha;
out float vHalo;
out float vSeed;
out vec3 vColor;

vec3 bob(vec4 r, float t) {
  return vec3(
    sin(t * r.z + 6.28 * r.w) * mix(0.1, 1.5, r.x),
    sin(t * r.y + 6.28 * r.x) * mix(0.1, 1.5, r.w),
    sin(t * r.w + 6.28 * r.y) * mix(0.1, 1.5, r.z)
  );
}

void main() {
  vec3 pos = aPosition * uSpread;
  pos.z *= ${DEPTH_SCALE.toFixed(1)};
  vec3 wobble = bob(aRandom, uTime);
  vec3 world = uRotation * pos + uOffset + wobble;
  float edge = 1.0;
  if (uDrift == 1 || uDrift == 2) {
    float span = uSpread * 2.0 + 3.0;
    float k = mod(aRandom.w * span + uOffset.y + wobble.y + (uDrift == 1 ? uTravel : -uTravel), span);
    world.y = k - span * 0.5;
    edge = smoothstep(0.0, span * 0.12, k) * smoothstep(span, span * 0.88, k);
  } else if (uDrift == 3) {
    float span = uSpread * ${DEPTH_SCALE.toFixed(1)} * 2.0 + 3.0;
    float k = mod(aRandom.y * span + uOffset.z + wobble.z + uTravel, span);
    world.z = k - span * 0.5;
    edge = smoothstep(0.0, span * 0.1, k);
  }
  vec3 view = world - vec3(0.0, 0.0, uCamera);
  float dist = length(view);
  float ahead = -view.z;
  if (ahead < ${NEAR_CLIP.toFixed(2)} || ahead > ${FAR_CLIP.toFixed(1)}) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  edge *= smoothstep(1.0, 4.0, ahead);
  vec2 ndc = vec2(view.x * ${FOV_FACTOR.toFixed(6)} / uAspect, view.y * ${FOV_FACTOR.toFixed(6)}) / ahead;
  vec2 screen = (ndc * 0.5 + 0.5) * uView;

  vec2 shift = vec2(0.0);
  float flash = 0.0;
  if (uEffect != 0 && uPointer.z > 0.001) {
    vec2 delta = screen - uPointer.xy;
    float reach = length(delta);
    float falloff = exp(-dot(delta, delta) / (uPointer.w * uPointer.w));
    vec2 away = reach > 0.001 ? delta / reach : vec2(0.0);
    shift += (uEffect == 1 ? away * uPointer.w * 0.5 : -delta * 0.6) * falloff * uStrength * uPointer.z;
  }
  for (int i = 0; i < ${MAX_BURSTS}; i++) {
    if (i >= uBurstCount) break;
    vec4 burst = uBursts[i];
    vec2 delta = screen - burst.xy;
    float reach = length(delta);
    float wave = exp(-pow((reach - burst.z * ${BURST_SPEED.toFixed(1)}) / ${BURST_WIDTH.toFixed(1)}, 2.0));
    vec2 away = reach > 0.001 ? delta / reach : vec2(0.0);
    float fade = (1.0 - burst.z) * (1.0 - burst.z) * burst.w;
    shift += away * wave * fade * 56.0 * smoothstep(0.0, 30.0, reach);
    flash += wave * fade;
  }
  screen += shift;

  float diameter = (uRandomness <= 0.0 ? uSize : uSize * (1.0 + uRandomness * (aRandom.x - 0.5)) / dist) * (1.0 + min(flash, 1.0) * 0.6);
  float device = diameter * uRatio;
  float radius = max(diameter, 1.0 / uRatio) * 0.5;
  float coverage = min(1.0, device * device);
  float blur = uBlur * max(uFocus - dist, 0.0) / max(dist, 1.0);
  float halo = uGlow > 0.0 ? radius * 2.5 + 2.0 : 0.0;
  float extent = radius * (uShape == 3 ? 1.6 : 1.0) + blur + halo + 1.5;

  float twinkle = 1.0 - uTwinkle * 0.6 * (0.5 + 0.5 * sin(uTime * (6.0 + aRandom.y * 14.0) + aRandom.w * 40.0));
  float far = smoothstep(${FAR_CLIP.toFixed(1)}, ${(FAR_CLIP * 0.9).toFixed(1)}, ahead);
  float focus = radius / (radius + blur);
  float reveal = clamp(uReveal * 1.6 - aRandom.z * 0.6, 0.0, 1.0);

  vLocal = aCorner * extent;
  vRadius = radius;
  vBlur = blur;
  vHalo = halo;
  vSeed = aRandom.y;
  vAlpha = min(1.0, coverage * twinkle * (1.0 + flash * 1.4)) * far * edge * max(focus, 0.35) * reveal * reveal;
  vColor = aColor;
  gl_Position = vec4((screen + aCorner * extent) / uView * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG_SHADER = `#version 300 es
precision highp float;
precision highp int;
uniform int uShape;
uniform float uGlow;
uniform float uRatio;
uniform float uTime;
uniform float uSoft;
uniform float uShimmer;
uniform float uOpacity;
in vec2 vLocal;
in float vRadius;
in float vBlur;
in float vAlpha;
in float vHalo;
in float vSeed;
in vec3 vColor;
out vec4 outColor;

float ray(vec2 q, float aa) {
  float width = 0.14 * max(0.0, 1.0 - q.x);
  return (1.0 - smoothstep(width - aa, width + aa, q.y)) * step(q.x, 1.0);
}

void main() {
  float soft = vBlur + 0.7 / uRatio + vRadius * uSoft;
  float d = length(vLocal);
  float shape;
  if (uShape == 1) {
    float box = max(abs(vLocal.x), abs(vLocal.y));
    shape = 1.0 - smoothstep(vRadius * 0.86 - soft, vRadius * 0.86 + soft, box);
  } else if (uShape == 2) {
    float edge = max(vRadius * 0.22, 0.6 / uRatio);
    shape = 1.0 - smoothstep(edge - soft, edge + soft, abs(d - vRadius * 0.8));
  } else if (uShape == 3) {
    float reach = vRadius * 1.6;
    vec2 q = abs(vLocal) / max(reach, 0.0001);
    float aa = soft / max(reach, 0.0001);
    shape = max(max(ray(q, aa), ray(q.yx, aa)), 1.0 - smoothstep(vRadius * 0.32 - soft, vRadius * 0.32 + soft, d));
  } else {
    shape = 1.0 - smoothstep(vRadius - soft, vRadius + soft, d);
  }
  float halo = vHalo > 0.0 ? exp(-d / (vHalo * 0.35)) * uGlow * 0.4 : 0.0;
  float alpha = clamp(shape + halo * (1.0 - shape), 0.0, 1.0) * vAlpha * uOpacity * (1.0 - uSoft);
  if (alpha < 0.002) discard;
  vec2 uv = vLocal / max(vRadius * 2.0, 0.0001) + 0.5;
  vec3 color = clamp(vColor + uShimmer * 0.2 * sin(uv.yxx + uTime + vSeed * 6.28), 0.0, 1.0);
  outColor = vec4(color * alpha, alpha);
}`;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) {
      uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
    }
  }
  return { program, uniforms };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOutCubic = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;

export function Particles({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ['#ffffff'],
  moveParticlesOnHover = true,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio,
  shape = 'circle',
  glow = 0.5,
  twinkle = 0.3,
  depthOfField = 0,
  hoverEffect = 'parallax',
  hoverRadius = 140,
  clickBurst = true,
  drift = 'none',
  driftSpeed = 1,
  variation = 0,
  intro = true,
  opacity = 1,
  lightMode = false,
  paused = false,
  className = '',
  style,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const syncRef = useRef(null);

  const colorsList = (Array.isArray(particleColors) ? particleColors : [particleColors])
    .filter(Boolean)
    .map(String);

  const config = {
    count: clamp(Math.round(particleCount), 1, MAX_PARTICLES),
    spread: Math.max(0.1, particleSpread),
    speed,
    colors: colorsList.length ? colorsList : ['#ffffff'],
    mouse: moveParticlesOnHover,
    hoverFactor: Math.max(0, particleHoverFactor),
    soft: alphaParticles,
    size: Math.max(0, particleBaseSize),
    randomness: Math.max(0, sizeRandomness),
    camera: Math.max(1, cameraDistance),
    rotate: !disableRotation,
    dpr: pixelRatio,
    shape: SHAPES[shape] ?? 0,
    glow: Math.max(0, glow),
    twinkle: clamp(twinkle, 0, 1),
    depthOfField: Math.max(0, depthOfField),
    hoverEffect: EFFECTS[hoverEffect] ?? 0,
    hoverRadius: Math.max(20, hoverRadius),
    clickBurst,
    drift: DRIFTS[drift] ?? 0,
    driftSpeed,
    variation: Math.max(0, Math.round(variation)),
    intro,
    opacity: clamp(opacity, 0, 1),
    lightMode,
    paused,
  };

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!container || !canvas || !gl) return;

    const prog = createProgram(gl, VERT_SHADER, FRAG_SHADER);
    if (!prog) return;

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posBuf = gl.createBuffer();
    const randBuf = gl.createBuffer();
    const colBuf = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const bindInstanced = (buf, loc, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(loc, 1);
    };
    bindInstanced(posBuf, 1, 3);
    bindInstanced(randBuf, 2, 4);
    bindInstanced(colBuf, 3, 3);
    gl.bindVertexArray(null);

    const ctx2d = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const colorCache = new Map();

    const parseColor = (col) => {
      if (colorCache.has(col)) return colorCache.get(col);
      let rgb = [1, 1, 1];
      if (ctx2d) {
        ctx2d.clearRect(0, 0, 1, 1);
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillStyle = col;
        ctx2d.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx2d.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      colorCache.set(col, rgb);
      return rgb;
    };

    const view = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, nx: 0, ny: 0, inside: false, active: 0 };
    const state = {
      clock: 0,
      spin: 0,
      travel: 0,
      offsetX: 0,
      offsetY: 0,
      reveal: configRef.current.intro && !reducedMotion ? 0 : 1,
    };
    const bursts = [];
    const burstArray = new Float32Array(16);
    const bufferState = { key: '', count: 0 };

    let rafId = 0;
    let lastTime = 0;
    let inView = true;

    const ensureBuffers = (cfg) => {
      const key = `${cfg.count}|${cfg.variation}|${cfg.colors.join(',')}|${+!!cfg.lightMode}`;
      if (key === bufferState.key) return;
      bufferState.key = key;
      const rng = mulberry32(cfg.variation * 7919 + 1);
      const count = cfg.count;
      const positions = new Float32Array(count * 3);
      const randoms = new Float32Array(count * 4);
      const colors = new Float32Array(count * 3);
      const palette = cfg.colors.map((c) => parseColor(c));

      for (let i = 0; i < count; i++) {
        let x, y, z, lenSq;
        do {
          x = rng() * 2 - 1;
          y = rng() * 2 - 1;
          z = rng() * 2 - 1;
          lenSq = x * x + y * y + z * z;
        } while (lenSq > 1 || lenSq === 0);
        const r = Math.cbrt(rng());
        positions.set([x * r, y * r, z * r], i * 3);
        randoms.set([rng(), rng(), rng(), rng()], i * 4);
        colors.set(palette[Math.floor(rng() * palette.length)], i * 3);
      }

      bufferState.count = count;
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, randBuf);
      gl.bufferData(gl.ARRAY_BUFFER, randoms, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    };

    const getRotationMatrix = (cfg) => {
      const t = state.clock * 1000;
      const rx = cfg.rotate ? Math.sin(t * 0.0002) * 0.1 : 0;
      const ry = cfg.rotate ? Math.cos(t * 0.0005) * 0.15 : 0;
      const rz = cfg.rotate ? state.spin : 0;
      const [sx, cx, sy, cy, sz, cz] = [
        Math.sin(rx),
        Math.cos(rx),
        Math.sin(ry),
        Math.cos(ry),
        Math.sin(rz),
        Math.cos(rz),
      ];
      return [
        cy * cz + sy * sx * sz,
        cx * sz,
        -sy * cz + cy * sx * sz,
        -cy * sz + sy * sx * cz,
        cx * cz,
        sy * sz + cy * sx * cz,
        sy * cx,
        -sx,
        cy * cx,
      ];
    };

    const renderFrame = () => {
      const cfg = configRef.current;
      ensureBuffers(cfg);
      const rot = getRotationMatrix(cfg);
      const [ox, oy, oz] = [state.offsetX, state.offsetY, -(1 - easeOutCubic(state.reveal)) * 70];

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const u = prog.uniforms;
      let bCount = 0;
      for (let i = bursts.length - 1; i >= 0 && bCount < MAX_BURSTS; i--) {
        burstArray.set([bursts[i].x, bursts[i].y, bursts[i].age / BURST_DURATION, 1], bCount * 4);
        bCount++;
      }

      gl.useProgram(prog.program);
      gl.bindVertexArray(vao);
      gl.uniformMatrix3fv(u.uRotation, false, rot);
      gl.uniform3f(u.uOffset, ox, oy, oz);
      gl.uniform1f(u.uSpread, cfg.spread);
      gl.uniform1f(u.uTime, state.clock);
      gl.uniform1f(u.uCamera, cfg.camera);
      gl.uniform1f(u.uAspect, view.width / view.height);
      gl.uniform2f(u.uView, view.width, view.height);
      gl.uniform1f(u.uRatio, view.ratio);
      gl.uniform1f(u.uSize, cfg.size);
      gl.uniform1f(u.uRandomness, cfg.randomness);
      gl.uniform1f(u.uBlur, cfg.depthOfField * 14);
      gl.uniform1f(u.uFocus, cfg.camera + 14);
      gl.uniform1f(u.uGlow, cfg.lightMode ? cfg.glow * 0.3 : cfg.glow);
      gl.uniform1f(u.uTwinkle, cfg.twinkle);
      gl.uniform1i(u.uShape, cfg.shape);
      gl.uniform1i(u.uDrift, cfg.drift);
      gl.uniform1f(u.uTravel, state.travel);
      gl.uniform4f(u.uPointer, pointer.sx, pointer.sy, pointer.active, cfg.hoverRadius);
      gl.uniform1i(u.uEffect, cfg.hoverEffect);
      gl.uniform1f(u.uStrength, cfg.hoverFactor);
      gl.uniform4fv(u.uBursts, burstArray);
      gl.uniform1i(u.uBurstCount, bCount);
      gl.uniform1f(u.uReveal, state.reveal);
      gl.uniform1f(u.uSoft, cfg.soft ? 0.2 : 0);
      gl.uniform1f(u.uShimmer, +!cfg.lightMode);
      gl.uniform1f(u.uOpacity, cfg.opacity);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, bufferState.count);
      gl.bindVertexArray(null);
    };

    const tick = (now) => {
      rafId = 0;
      if (!inView || document.hidden) return;
      const cfg = configRef.current;
      const dt = lastTime ? clamp((now - lastTime) / 1000, 0.0005, 0.05) : 1 / 60;
      lastTime = now;
      if (cfg.paused) {
        state.reveal = 1;
        renderFrame();
        lastTime = 0;
        return;
      }
      const motionScale = +!reducedMotion;
      const step = dt * cfg.speed * motionScale;
      state.clock += step;
      if (cfg.rotate) state.spin += step * 0.6;
      state.travel += dt * cfg.driftSpeed * motionScale * (cfg.drift === 3 ? 6 : 0.9);

      const isHovering = cfg.mouse && pointer.inside && !reducedMotion;
      const lerp = 1 - Math.exp(-dt / 0.35);
      const factor = isHovering && cfg.hoverEffect === 0 ? cfg.hoverFactor : 0;
      state.offsetX += (-pointer.nx * factor - state.offsetX) * lerp;
      state.offsetY += (-pointer.ny * factor - state.offsetY) * lerp;
      pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt / 0.06));
      pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt / 0.06));
      pointer.active += (+!!isHovering - pointer.active) * (1 - Math.exp(-dt / 0.2));

      for (let i = bursts.length - 1; i >= 0; i--) {
        bursts[i].age += dt;
        if (bursts[i].age >= BURST_DURATION) bursts.splice(i, 1);
      }

      if (!cfg.intro || reducedMotion) {
        state.reveal = 1;
      } else if (state.reveal < 1) {
        state.reveal = Math.min(1, state.reveal + dt / INTRO_DURATION);
      }

      renderFrame();
      rafId = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (!rafId && inView && !document.hidden) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const handleResize = () => {
      const cfg = configRef.current;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const dpr = Math.min(cfg.dpr || window.devicePixelRatio || 1, 2);
      view.width = w;
      view.height = h;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      view.ratio = canvas.width / w;
      renderFrame();
      schedule();
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    handleResize();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      gl.deleteProgram(prog.program);
      [quadBuf, posBuf, randBuf, colBuf].forEach((b) => gl.deleteBuffer(b));
      gl.deleteVertexArray(vao);
    };
  }, []);

  return (
    <div ref={containerRef} className={`particles-container${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="particles-canvas" aria-hidden="true" />
    </div>
  );
}

const METEORS = [
  { top: '-8%', left: '8%', duration: '9s', delay: '-3s' },
  { top: '-12%', left: '35%', duration: '11s', delay: '-9s' },
  { top: '12%', left: '-10%', duration: '10s', delay: '-6s' },
  { top: '28%', left: '4%', duration: '12s', delay: '-10s' },
  { top: '-14%', left: '54%', duration: '10s', delay: '-2s' },
  { top: '-6%', left: '78%', duration: '12s', delay: '-7s' },
  { top: '8%', left: '18%', duration: '11s', delay: '-5s' },
  { top: '22%', left: '-8%', duration: '9s', delay: '-8s' },
  { top: '-10%', left: '92%', duration: '13s', delay: '-11s' },
  { top: '36%', left: '-12%', duration: '11s', delay: '-4s' },
  { top: '-18%', left: '43%', duration: '8s', delay: '-6s' },
  { top: '4%', left: '3%', duration: '12s', delay: '-1s' },
  { top: '16%', left: '30%', duration: '10s', delay: '-9s' },
  { top: '30%', left: '-6%', duration: '13s', delay: '-12s' },
  { top: '-5%', left: '65%', duration: '9s', delay: '-4s' },
];

export function AmbientParticlesAndMeteors() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    let timer;
    const onScroll = () => {
      setIsScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsScrolling(false), 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [isMobile]);

  return (
    <>
      <Particles
        particleColors={['#ffffff', '#fca5a5', '#fde68a']}
        particleCount={isMobile ? 280 : 660}
        pixelRatio={isMobile ? 1 : undefined}
        particleSpread={10}
        speed={0.01}
        particleBaseSize={40}
        glow={0.06}
        twinkle={0.15}
        moveParticlesOnHover={false}
        hoverEffect="parallax"
        sizeRandomness={2}
        shape="circle"
        depthOfField={0}
        drift="up"
        driftSpeed={0.6}
        alphaParticles={true}
        disableRotation={true}
        cameraDistance={20}
        variation={0}
        opacity={1}
        paused={isMobile && isScrolling}
        clickBurst={false}
        intro={false}
        lightMode={false}
        className="particles-background"
        style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      />
      <div className="meteor-background" aria-hidden="true">
        {METEORS.map((m, idx) => (
          <span
            key={idx}
            className="meteor"
            style={{
              '--meteor-top': m.top,
              '--meteor-left': m.left,
              '--meteor-duration': m.duration,
              '--meteor-delay': m.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}
