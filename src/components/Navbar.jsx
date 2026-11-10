import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { Volume2, VolumeX, Menu, X, Send } from 'lucide-react';
import { GlassSurface } from './react-bits/GlassSurface';
import { useSound } from '../context/SoundContext';
import { PROFILE } from '../data/portfolioData';

const NAV_ITEMS = [
  { name: 'Home', href: '#Home' },
  { name: 'About', href: '#About' },
  { name: 'Portfolio', section: 'Portofolio', href: '#Portofolio' },
  { name: 'Contact', href: '#Contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('Home');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { soundEnabled, toggleSound } = useSound();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const sections = ['Home', 'About', 'Portofolio', 'Contact'];
      const threshold = window.innerHeight * 0.38;
      let current = sections[0];
      sections.forEach((sec) => {
        const el = document.getElementById(sec);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = sec;
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pill = document.querySelector('.navbar-link-item.is-active .navbar-active-pill');
    if (!pill) return;
    const pop = gsap.fromTo(
      pill,
      { autoAlpha: 0, scale: 0.82 },
      { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2)' }
    );
    const pulse = gsap.to(pill, {
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 0 28px rgba(147,51,234,.48)',
      duration: 1.5,
      delay: 0.55,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => {
      pop.kill();
      pulse.kill();
      gsap.set(pill, { clearProps: 'all' });
    };
  }, [activeSection]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`navbar-root ${scrolled ? 'navbar-scrolled' : ''}`}>
      <GlassSurface
        className="navbar-container"
        width="var(--navbar-width)"
        height="auto"
        borderRadius={999}
        blur={14}
        distortionScale={-70}
        displace={0.25}
        greenOffset={4}
        blueOffset={8}
        backgroundOpacity={scrolled ? 0.14 : 0.08}
      >
        <nav className="navbar-links">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === (item.section || item.name);
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`navbar-link-item ${isActive ? 'is-active' : ''}`}
              >
                <span>{item.name}</span>
                {isActive && <span className="navbar-active-pill" />}
              </a>
            );
          })}
        </nav>

        <span className="navbar-mobile-brand" aria-label={PROFILE.mobileBrand}>
          {PROFILE.mobileBrand}
        </span>

        <div className="navbar-actions">
          <span className="navbar-actions-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleSound}
            className="navbar-icon-btn"
            title={soundEnabled ? 'Matikan Suara SFX' : 'Nyalakan Suara SFX'}
            aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 size={16} className="text-accent-icon" /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            className="navbar-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </GlassSurface>

      <div className={`navbar-mobile-menu ${mobileOpen ? 'is-open' : ''}`}>
        <GlassSurface
          className="navbar-mobile-glass"
          width="100%"
          height="auto"
          borderRadius={20}
          blur={14}
          distortionScale={-70}
          displace={0.25}
          greenOffset={4}
          blueOffset={8}
          backgroundOpacity={0.12}
        >
          <div className="navbar-mobile-inner">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === (item.section || item.name);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`navbar-mobile-link ${isActive ? 'is-active' : ''}`}
                >
                  <span>{item.name}</span>
                  {isActive && <span className="navbar-mobile-indicator" />}
                </a>
              );
            })}
            <div className="navbar-mobile-footer">
              <a
                href="#Contact"
                onClick={(e) => handleNavClick(e, '#Contact')}
                className="navbar-mobile-cta"
              >
                <span>Hubungi Saya</span>
                <Send size={14} />
              </a>
            </div>
          </div>
        </GlassSurface>
      </div>
    </header>
  );
}
