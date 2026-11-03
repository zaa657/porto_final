import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import { AmbientParticlesAndMeteors } from './components/react-bits/Particles';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Experience } from './components/Experience';
import { SpotifySection } from './components/SpotifySection';
import { Portfolio } from './components/Portfolio';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ProjectDetail } from './components/ProjectDetail';
import { PROJECTS } from './data/portfolioData';

gsap.registerPlugin(ScrollTrigger);

const TRIGGER_OFFSET = 120;
const BODY_OFFSET = 90;

function animateSectionElements(sectionEl, titleSel, bodySel, useBlur) {
  const titles = sectionEl.querySelectorAll(titleSel);
  const bodies = sectionEl.querySelectorAll(bodySel);
  if (!titles.length && !bodies.length) return;

  const fromVars = {
    autoAlpha: 0,
    y: 24,
    ...(useBlur ? { filter: 'blur(6px)' } : {}),
  };
  const toVars = {
    autoAlpha: 1,
    y: 0,
    ...(useBlur ? { filter: 'blur(0px)' } : {}),
  };
  const triggerEl = titles[0] || sectionEl;

  const createAnim = (targets, extraOffset = 0, stagger = 0.12) => {
    if (!targets.length) return;
    gsap.fromTo(targets, fromVars, {
      ...toVars,
      duration: 0.65,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: triggerEl,
        start: `top bottom-=${TRIGGER_OFFSET + extraOffset}`,
        toggleActions: 'play none none reverse',
      },
    });
  };

  createAnim(titles, 0, 0.08);
  createAnim(bodies, BODY_OFFSET);
}

function useHomeScrollAnimations(containerRef, introDone) {
  useEffect(() => {
    const root = containerRef.current;
    if (!introDone || !root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const useBlur = !isMobile;

    const ctx = gsap.context(() => {
      if (!isMobile) {
        gsap.utils.toArray('.gsap-ambient-orb', root).forEach((orb, idx) => {
          gsap.to(orb, {
            x: idx % 2 === 0 ? 28 : -24,
            y: idx === 1 ? -34 : 26,
            scale: idx === 2 ? 1.12 : 1.06,
            autoAlpha: idx === 1 ? 0.72 : 0.9,
            duration: 7 + idx * 1.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: idx * -1.4,
          });
        });
      }

      [
        ['.about-root-section', '.section-display-title', '.about-intro, .about-portrait-stage, .about-bio'],
        ['.experience-section', '.experience-group h2', '.experience-card, .experience-stat-card'],
        ['.spotify-section', '.spotify-copy h2', '.spotify-card'],
        [
          '.portfolio-root-section',
          '.section-display-title',
          '.portfolio-tab-bar, .portfolio-projects-view, .portfolio-skills-view, .portfolio-certificates-view, .portfolio-awards-view',
        ],
        ['.contact-root-section', '.section-display-title', '.contact-panel'],
      ].forEach(([secSel, titleSel, bodySel]) => {
        const secEl = root.querySelector(secSel);
        if (secEl) animateSectionElements(secEl, titleSel, bodySel, useBlur);
      });

      const commentsPanel = root.querySelector('.contact-comments-panel');
      if (commentsPanel) {
        gsap.fromTo(
          commentsPanel,
          { autoAlpha: 0, y: 24, ...(useBlur ? { filter: 'blur(6px)' } : {}) },
          {
            autoAlpha: 1,
            y: 0,
            ...(useBlur ? { filter: 'blur(0px)' } : {}),
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: commentsPanel,
              start: 'top bottom-=210',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, root);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [introDone, containerRef]);
}

function HomePage({ onOpenProject }) {
  const containerRef = useRef(null);
  const [introFinished, setIntroFinished] = useState(
    () => sessionStorage.getItem('portfolio-intro-finished') === 'true'
  );
  const [lanyardIntroStarted, setLanyardIntroStarted] = useState(introFinished);

  useHomeScrollAnimations(containerRef, introFinished);

  return (
    <div ref={containerRef} className="home-page-container">
      <div className="gsap-ambient" aria-hidden="true">
        <span className="gsap-ambient-orb gsap-ambient-orb-one" />
        <span className="gsap-ambient-orb gsap-ambient-orb-two" />
        <span className="gsap-ambient-orb gsap-ambient-orb-three" />
      </div>

      <AmbientParticlesAndMeteors />

      <div className="home-ui-scale">
        {!introFinished && (
          <WelcomeScreen
            onComplete={() => {
              sessionStorage.setItem('portfolio-intro-finished', 'true');
              setIntroFinished(true);
            }}
            onExitAnimationStart={() => setLanyardIntroStarted(true)}
          />
        )}

        <Navbar />

        <main>
          <Hero lanyardIntroStarted={lanyardIntroStarted} />
          <About />
          <Experience />
          <SpotifySection />
          <Portfolio onOpenProject={onOpenProject} />
          <Contact />
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleOpenProject = (projectId) => {
    window.history.pushState({ fromPortfolio: true }, '', `/project/${encodeURIComponent(projectId)}`);
    setPathname(window.location.pathname);
    window.scrollTo(0, 0);
  };

  const handleBackToPortfolio = () => {
    if (window.history.state?.fromPortfolio) {
      window.history.back();
    } else {
      window.history.pushState({}, '', '/#Portofolio');
      setPathname('/');
      window.requestAnimationFrame(() => {
        document.getElementById('Portofolio')?.scrollIntoView();
      });
    }
  };

  const match = pathname.match(/^\/project\/([^/]+)\/?$/);
  const projectId = match ? decodeURIComponent(match[1]) : null;
  const activeProject = PROJECTS.find((p) => p.id === projectId);

  return (
    <ThemeProvider>
      <SoundProvider>
        {activeProject ? (
          <ProjectDetail project={activeProject} onBack={handleBackToPortfolio} />
        ) : (
          <HomePage onOpenProject={handleOpenProject} />
        )}
      </SoundProvider>
    </ThemeProvider>
  );
}
