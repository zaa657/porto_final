import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { PROFILE } from '../data/portfolioData';

const LOAD_DURATION = 2200;
const EXIT_DURATION = 700;

export function WelcomeScreen({ onComplete, onExitAnimationStart }) {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const completeTimerRef = useRef(0);
  const exitTimerRef = useRef(0);
  const finishedRef = useRef(false);
  const restoreScrollRef = useRef(null);

  useLayoutEffect(() => {
    const { body, documentElement } = document;
    const saved = {
      htmlOverflow: documentElement.style.overflow,
      htmlScrollBehavior: documentElement.style.scrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
    };
    let locked = true;
    const preventScroll = (e) => e.preventDefault();
    const preventKeys = (e) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('button, a, input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      if (['ArrowDown', 'ArrowUp', ' ', 'End', 'Home', 'PageDown', 'PageUp'].includes(e.key)) {
        e.preventDefault();
      }
    };

    documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    documentElement.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = '0';
    body.style.left = '0';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.overflow = 'hidden';

    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('keydown', preventKeys);

    const unlock = () => {
      if (!locked) return;
      locked = false;
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', preventKeys);
      documentElement.style.overflow = saved.htmlOverflow;
      documentElement.style.scrollBehavior = saved.htmlScrollBehavior;
      body.style.position = saved.bodyPosition;
      body.style.top = saved.bodyTop;
      body.style.left = saved.bodyLeft;
      body.style.width = saved.bodyWidth;
      body.style.height = saved.bodyHeight;
      body.style.overflow = saved.bodyOverflow;
      window.scrollTo(0, 0);
    };

    restoreScrollRef.current = unlock;
    return () => {
      unlock();
      restoreScrollRef.current = null;
    };
  }, []);

  const finishLoading = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    restoreScrollRef.current?.();
    setLeaving(true);
    exitTimerRef.current = window.setTimeout(onExitAnimationStart, 200);
    completeTimerRef.current = window.setTimeout(onComplete, EXIT_DURATION);
  }, [onComplete, onExitAnimationStart]);

  useEffect(() => {
    const start = performance.now();
    finishedRef.current = false;

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      setProgress(Math.min(Math.floor((elapsed / LOAD_DURATION) * 95), 95));
    }, 45);

    const preloadPhoto = new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = PROFILE.photoUrl;
    });

    const minWait = new Promise((resolve) => {
      window.setTimeout(resolve, LOAD_DURATION);
    });

    Promise.all([preloadPhoto, minWait]).then(() => {
      setProgress(100);
      finishLoading();
    });

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completeTimerRef.current);
      window.clearTimeout(exitTimerRef.current);
    };
  }, [finishLoading]);

  return (
    <div className={`welcome-screen-root${leaving ? ' is-leaving' : ''}`}>
      <div className="welcome-loader">
        <span
          className="welcome-loader-number"
          role="status"
          aria-live="polite"
          aria-label={`Memuat aset portfolio ${progress}%`}
        >
          {progress}
          <span>%</span>
        </span>
        <div className="welcome-progress-track" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span className="welcome-loader-count">Memuat assets...</span>
      </div>
    </div>
  );
}
