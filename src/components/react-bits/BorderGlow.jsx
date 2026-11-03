import React, { useRef, useCallback, useEffect } from 'react';

const GRADIENT_STOPS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_VARS = [
  '--gradient-one',
  '--gradient-two',
  '--gradient-three',
  '--gradient-four',
  '--gradient-five',
  '--gradient-six',
  '--gradient-seven',
];
const COLOR_INDICES = [0, 1, 2, 0, 1, 2, 1];

function parseHsl(str) {
  const m = str.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/);
  return m
    ? {
        hue: Number.parseFloat(m[1]),
        saturation: Number.parseFloat(m[2]),
        lightness: Number.parseFloat(m[3]),
      }
    : { hue: 40, saturation: 80, lightness: 80 };
}

function buildGlowVars(hslStr, intensity) {
  const { hue, saturation, lightness } = parseHsl(hslStr);
  const alphas = [100, 60, 50, 40, 30, 20, 10];
  const suffixes = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  return Object.fromEntries(
    alphas.map((a, idx) => [
      `--glow-color${suffixes[idx]}`,
      `hsl(${hue}deg ${saturation}% ${lightness}% / ${Math.min(a * intensity, 100)}%)`,
    ])
  );
}

function buildGradientVars(colors) {
  const palette = colors.length ? colors : ['#dc2626'];
  const vars = Object.fromEntries(
    GRADIENT_VARS.map((varName, idx) => {
      const col = palette[Math.min(COLOR_INDICES[idx], palette.length - 1)];
      return [varName, `radial-gradient(at ${GRADIENT_STOPS[idx]}, ${col} 0px, transparent 50%)`];
    })
  );
  vars['--gradient-base'] = `linear-gradient(${palette[0]} 0 100%)`;
  return vars;
}

function isLightColor(hex) {
  const clean = hex.trim().replace('#', '');
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(clean)) return false;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 180;
}

export function BorderGlow({
  as: Component = 'div',
  children,
  className = '',
  style,
  edgeSensitivity = 30,
  glowColor = '0 84 60',
  backgroundColor = '#14080c',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ['#dc2626', '#f59e0b', '#fb7185'],
  fillOpacity = 0.5,
  ...rest
}) {
  const cardRef = useRef(null);

  const getCenter = useCallback((el) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const [cx, cy] = getCenter(el);
      const dx = x - cx;
      const dy = y - cy;
      const rx = dx === 0 ? Infinity : cx / Math.abs(dx);
      const ry = dy === 0 ? Infinity : cy / Math.abs(dy);
      const proximity = Math.min(Math.max(1 / Math.min(rx, ry), 0), 1);
      const angle = dx === 0 && dy === 0 ? 0 : ((180 / Math.PI) * Math.atan2(dy, dx) + 450) % 360;
      el.style.setProperty('--edge-proximity', `${(proximity * 100).toFixed(3)}`);
      el.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    },
    [getCenter]
  );

  useEffect(() => {
    if (!animated || !cardRef.current) return;
    const el = cardRef.current;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    const duration = 5000;
    let rafId = 0;
    const animate = (now) => {
      const progress = ((now - start) % duration) / duration;
      el.classList.add('sweep-active');
      el.style.setProperty('--cursor-angle', `${110 + 360 * progress}deg`);
      el.style.setProperty('--edge-proximity', '100');
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      el.classList.remove('sweep-active');
    };
  }, [animated]);

  const clampedSensitivity = Math.min(Math.max(edgeSensitivity, 0), 79);
  const glowVars = buildGlowVars(glowColor, Math.max(0, glowIntensity));
  const gradVars = buildGradientVars(colors);

  return (
    <Component
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card${isLightColor(backgroundColor) ? ' border-glow-card--light' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': clampedSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': Math.min(Math.max(coneSpread, 0), 100),
        '--fill-opacity': Math.min(Math.max(fillOpacity, 0), 1),
        ...glowVars,
        ...gradVars,
        ...style,
      }}
      {...rest}
    >
      <span className="edge-light" aria-hidden="true" />
      <div className="border-glow-inner">{children}</div>
    </Component>
  );
}
