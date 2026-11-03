import React, { createContext, useContext, useState, useEffect } from 'react';

let audioCtx = null;
const CLICK_GAIN = 0.25;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const sfx = {
  hover: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  },
  click: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(CLICK_GAIN, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  },
  switchTheme: (isDark) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = isDark ? 400 : 700;
      const endFreq = isDark ? 800 : 350;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  },
  success: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.06, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {}
  },
};

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('portfolio-sound') !== 'disabled'
  );

  useEffect(() => {
    localStorage.setItem('portfolio-sound', soundEnabled ? 'enabled' : 'disabled');
  }, [soundEnabled]);

  const toggleSound = () => setSoundEnabled((prev) => !prev);

  const playSfx = (name, ...args) => {
    if (soundEnabled && sfx[name]) {
      sfx[name](...args);
    }
  };

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, playSfx }}>
      <div
        style={{ display: 'contents' }}
        onClickCapture={(e) => {
          if (!soundEnabled || !(e.target instanceof Element)) return;
          const interactive = e.target.closest('button, a, [role="button"]');
          if (
            interactive &&
            !interactive.disabled &&
            interactive.getAttribute('aria-disabled') !== 'true'
          ) {
            sfx.click();
          }
        }}
      >
        {children}
      </div>
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
