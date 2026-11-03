import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Send, Github, Instagram } from 'lucide-react';
import { HeroLanyardSection } from './react-bits/Lanyard';
import { PROFILE } from '../data/portfolioData';

export const GitHubIcon = Github;
export const InstagramIcon = Instagram;

export function TikTokIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.41a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.86-4.49V8.53a8.21 8.21 0 0 0 4.91 1.58V6.69z" />
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
