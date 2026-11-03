import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { HeroLanyardSection } from './react-bits/Lanyard';
import { PROFILE } from '../data/portfolioData';

export function GitHubIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export function InstagramIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function TikTokIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.3V2h-3.64v13.67a2.9 2.9 0 0 1-2.9 2.75 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .6.05.88.14V9.05a6.5 6.5 0 1 0 5.66 6.45V8.53a8.4 8.4 0 0 0 4.91 1.58V6.69h-1.14Z" />
    </svg>
  );
}

const SOCIAL_BTNS = [
  { icon: GitHubIcon, link: PROFILE.socials[2].url, label: 'GitHub' },
  { icon: InstagramIcon, link: PROFILE.socials[0].url, label: 'Instagram' },
  { icon: TikTokIcon, link: PROFILE.socials[1].url, label: 'TikTok' },
];

export function Hero({ lanyardIntroStarted }) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [roleIdx, setRoleIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  const stepTypewriter = useCallback(() => {
    const currentRole = PROFILE.roles[roleIdx];
    if (isTyping) {
      if (charIdx < currentRole.length) {
        setDisplayText((prev) => prev + currentRole[charIdx]);
        setCharIdx((prev) => prev + 1);
      } else {
        setTimeout(() => setIsTyping(false), 2000);
      }
    } else if (charIdx > 0) {
      setDisplayText((prev) => prev.slice(0, -1));
      setCharIdx((prev) => prev - 1);
    } else {
      setRoleIdx((prev) => (prev + 1) % PROFILE.roles.length);
      setIsTyping(true);
    }
  }, [charIdx, isTyping, roleIdx]);

  useEffect(() => {
    const timer = setTimeout(stepTypewriter, isTyping ? 90 : 45);
    return () => clearTimeout(timer);
  }, [stepTypewriter, isTyping]);

  return (
    <section className="hero-root-section" id="Home">
      <HeroLanyardSection introFinished={lanyardIntroStarted} />
      <div className="hero-container-inner">
        <div className="hero-text-col">
          <div className="hero-heading-group">
            <h1 className="hero-h1-gradient">Welcome to</h1>
            <h1 className="hero-h1-white">My Portfolio</h1>
          </div>

          <div className="hero-typewriter-row">
            <span className="hero-typewriter-text">{displayText}</span>
            <span className="hero-typewriter-cursor" />
          </div>

          <p className="hero-description-copy">{PROFILE.heroDescription}</p>

          <div className="hero-action-row">
            <a href="#Portofolio" className="hero-btn-primary">
              <span>Lihat Projek</span>
              <ArrowRight size={16} />
            </a>
            <a href="#Contact" className="hero-btn-secondary">
              <span>Hubungi Saya</span>
              <Send size={15} />
            </a>
          </div>

          <div className="hero-find-me-wrap">
            <span className="hero-find-me-label">Find me</span>
            <div className="hero-social-buttons">
              {SOCIAL_BTNS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-social-icon-btn"
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
