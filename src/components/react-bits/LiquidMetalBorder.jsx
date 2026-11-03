import React, { useRef, useEffect } from 'react';

const VERT_SHADER = `#version 300 es
precision mediump float;
layout(location = 0) in vec4 a_position;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;

void main() {
  gl_Position = a_position;
  vec2 uv = gl_Position.xy * 0.5;
  v_responsiveBoxGivenSize = max(u_resolution, vec2(1.0));
  v_responsiveUV = uv;
}`;

const FRAG_SHADER = `#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
out vec4 fragColor;

#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump) {
  float ch = mix(c2, c1, smoothstep(0.0, 2.0 * blur, stripe_p));
  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe_p));
  border = w[0] + 0.4 * (1.0 - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe_p));
  border = w[0] + 0.5 * (1.0 - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe_p));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe_p));
  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0.0, 1.0, gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + 0.5 * blur, stripe_p));
  return ch;
}

void main() {
  float t = 0.3 * (u_time + 2.8);
  vec2 borderUV = v_responsiveUV + 0.5;
  float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 mask = min(borderUV, 1.0 - borderUV);
  vec2 pixel_thickness = min(250.0 / v_responsiveBoxGivenSize, vec2(0.5));
  float maskX = pow(smoothstep(0.0, pixel_thickness.x, mask.x), 0.25);
  float maskY = pow(smoothstep(0.0, pixel_thickness.y, mask.y), 0.25);
  float edge = clamp(1.0 - maskX * maskY, 0.0, 1.0);

  vec2 uv = v_responsiveUV;
  if (ratio > 1.0) uv.y /= ratio;
  else uv.x *= ratio;
  uv += 0.5;
  uv.y = 1.0 - uv.y;

  float cycleWidth = u_repetition * 2.0;
  vec2 rotatedUV = uv - vec2(0.5);
  float angle = (-u_angle + 70.0) * PI / 180.0;
  rotatedUV = vec2(
    rotatedUV.x * cos(angle) - rotatedUV.y * sin(angle),
    rotatedUV.x * sin(angle) + rotatedUV.y * cos(angle)
  ) + vec2(0.5);

  float opacity = 1.0 - smoothstep(0.9 - 2.0 * fwidth(edge), 0.9, edge);
  edge = 1.2 * edge;

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  // Warm luxury gold & crimson liquid metal tint
  vec3 color1 = vec3(1.0, 0.92, 0.85);
  vec3 color2 = vec3(0.22, 0.05, 0.08 + 0.1 * smoothstep(0.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - 0.5;
  float dist = length(grad_uv + vec2(0.0, 0.2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (0.25 - 0.2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = (1.0 - pow(1.8 * dist, 1.2)) * pow(uv.y, 0.3);
  float thin_strip_1_ratio = 0.12 / cycleWidth * (1.0 - 0.4 * bump);
  float thin_strip_2_ratio = 0.07 / cycleWidth * (1.0 + 0.4 * bump);
  float wide_strip_ratio = 1.0 - thin_strip_1_ratio - thin_strip_2_ratio;

  float noise = snoise(uv - t);
  edge += (1.0 - edge) * u_distortion * noise;
  direction += diagBLtoTR - 2.0 * noise * diagBLtoTR * (smoothstep(0.0, 1.0, edge) * (1.0 - smoothstep(0.0, 1.0, edge)));
  bump *= clamp(pow(uv.y, 0.1), 0.3, 1.0);
  direction *= (0.1 + (1.1 - edge) * bump) * (0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge)));
  direction *= (0.5 + 0.5 * pow(uv.y, 2.0)) * cycleWidth;
  direction -= t;

  float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);
  float dispersionRed = (colorDispersion + 0.03 * bump * noise - diagBLtoTR) * (u_shiftRed / 20.0);
  float dispersionBlue = (colorDispersion * 1.3 - 0.2 * edge) * (u_shiftBlue / 20.0);

  float blur = u_softness / 15.0;
  vec3 w = vec3(cycleWidth * thin_strip_1_ratio, cycleWidth * thin_strip_2_ratio - 0.02 * smoothstep(0.0, 1.0, edge + bump), wide_strip_ratio);

  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r), bump);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g), bump);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump);

  vec3 color = vec3(r, g, b) * opacity;
  fragColor = vec4(color, opacity);
}`;

function compileProgram(gl, vsSrc, fsSrc) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export function LiquidMetalBorder({ className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const canvas = document.createElement('canvas');
    parent.prepend(canvas);
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
    if (!gl) {
      canvas.remove();
      return;
    }

    const prog = compileProgram(gl, VERT_SHADER, FRAG_SHADER);
    if (!prog) {
      canvas.remove();
      return;
    }

    const posLoc = gl.getAttribLocation(prog, 'a_position');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(prog);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uDpr = gl.getUniformLocation(prog, 'u_pixelRatio');
    gl.uniform1f(gl.getUniformLocation(prog, 'u_repetition'), 4);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_softness'), 0.5);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_shiftRed'), 0.45);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_shiftBlue'), 0.25);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_distortion'), 0);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_contour'), 0);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_angle'), 45);

    let rafId = null;
    let lastTime = performance.now();
    let frame = 0;
    let inView = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reducedMotion ? 0 : 0.6;

    const render = (now) => {
      const dt = now - lastTime;
      lastTime = now;
      frame += dt * speed;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(uTime, frame * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (speed !== 0 && inView && !document.hidden) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    };

    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(parent.clientWidth * dpr));
      const h = Math.max(1, Math.round(parent.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.useProgram(prog);
        gl.uniform2f(uRes, w, h);
        gl.uniform1f(uDpr, dpr);
        render(performance.now());
      }
    });
    ro.observe(parent);

    const io = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      if (inView && !rafId && speed !== 0) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(render);
      }
    });
    io.observe(parent);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      canvas.remove();
    };
  }, []);

  return <div ref={containerRef} className={`liquid-metal-border${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}
