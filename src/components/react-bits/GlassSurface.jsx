import React, { useId, useState, useRef, useEffect } from 'react';

export function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  refraction = true,
  className = '',
  style = {},
}) {
  const rawId = useId().replace(/:/g, '-');
  const filterId = `glass-filter-${rawId}`;
  const redGradId = `red-grad-${rawId}`;
  const blueGradId = `blue-grad-${rawId}`;
  const softId = `soft-${rawId}`;

  const [svgSupported, setSvgSupported] = useState(false);
  const containerRef = useRef(null);
  const feImageRef = useRef(null);
  const redDispRef = useRef(null);
  const greenDispRef = useRef(null);
  const blueDispRef = useRef(null);
  const blurRef = useRef(null);

  const buildDisplacementSvg = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 400;
    const h = rect?.height || 200;
    const pad = borderWidth * 0.5 * Math.min(w, h);
    const svg = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
          <filter id="${softId}" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB">
            <feGaussianBlur stdDeviation="${blur}" />
          </filter>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="black"></rect>
        <rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" filter="url(#${softId})" />
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const updateFilterAttributes = () => {
    const dataUri = buildDisplacementSvg();
    feImageRef.current?.setAttribute('href', dataUri);
    [
      { ref: redDispRef, offset: redOffset },
      { ref: greenDispRef, offset: greenOffset },
      { ref: blueDispRef, offset: blueOffset },
    ].forEach(({ ref, offset }) => {
      if (ref.current) {
        ref.current.setAttribute('scale', (distortionScale + offset).toString());
        ref.current.setAttribute('xChannelSelector', xChannel);
        ref.current.setAttribute('yChannelSelector', yChannel);
      }
    });
    blurRef.current?.setAttribute('stdDeviation', displace.toString());
  };

  useEffect(() => {
    updateFilterAttributes();
  }, [
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      updateFilterAttributes();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    if (isSafari || isFirefox) {
      setSvgSupported(false);
      return;
    }
    const testEl = document.createElement('div');
    testEl.style.backdropFilter = `url(#${filterId})`;
    setSvgSupported(testEl.style.backdropFilter !== '');
  }, [filterId]);

  const useSvg = svgSupported && refraction;

  const combinedStyle = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    '--glass-frost': backgroundOpacity,
    '--glass-saturation': saturation,
    '--filter-id': `url(#${filterId})`,
  };

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${useSvg ? 'glass-surface--svg' : 'glass-surface--fallback'} ${className}`}
      style={combinedStyle}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
          >
            <feImage
              ref={feImageRef}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              ref={redDispRef}
              in="SourceGraphic"
              in2="map"
              id="redchannel"
              result="dispRed"
            />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />
            <feDisplacementMap
              ref={greenDispRef}
              in="SourceGraphic"
              in2="map"
              id="greenchannel"
              result="dispGreen"
            />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />
            <feDisplacementMap
              ref={blueDispRef}
              in="SourceGraphic"
              in2="map"
              id="bluechannel"
              result="dispBlue"
            />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={blurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>
      {!useSvg && <span className="glass-surface__sheen" aria-hidden="true" />}
      {!useSvg && <span className="glass-surface__rim" aria-hidden="true" />}
      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
