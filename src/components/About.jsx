import React, { useRef, useEffect } from 'react';
import { MessageSquare, Code2, ArrowUpRight } from 'lucide-react';
import { SkeletonImage } from './SkeletonImage';
import { PROFILE } from '../data/portfolioData';

export function About() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const timeoutRef = useRef(null);

  const hideTimeoutRef = useRef(null);

  const updateSpotlight = (clientX, clientY) => {
    const stage = stageRef.current;
    const portrait = stage?.querySelector('.about-portrait');
    if (!stage || !portrait) return;
    clearTimeout(timeoutRef.current);
    clearTimeout(hideTimeoutRef.current);
    const rect = portrait.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const hx = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const hy = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    stage.style.setProperty('--hover-x', `${hx}%`);
    stage.style.setProperty('--hover-y', `${hy}%`);
    stage.classList.add('spider-hovered');
    stage.dataset.spiderVisible = 'true';
  };

  const endSpotlight = (delayMs = 0) => {
    const stage = stageRef.current;
    if (!stage) return;
    clearTimeout(hideTimeoutRef.current);
    clearTimeout(timeoutRef.current);
    if (delayMs > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        delete stage.dataset.spiderVisible;
      }, delayMs);
    } else {
      delete stage.dataset.spiderVisible;
    }
    timeoutRef.current = setTimeout(() => {
      stage.classList.remove('spider-hovered');
    }, 7000);
  };

  useEffect(() => {
    const sec = sectionRef.current;
    const stage = stageRef.current;
    if (!sec || !stage) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        stage.classList.toggle('is-in-view', entry.isIntersecting);
        if (!entry.isIntersecting) {
          clearTimeout(timeoutRef.current);
          clearTimeout(hideTimeoutRef.current);
          stage.classList.remove('spider-hovered');
          delete stage.dataset.spiderVisible;
        }
      },
      { threshold: 0.2 }
    );
    io.observe(sec);
    return () => {
      io.disconnect();
      clearTimeout(timeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="about-root-section"
      id="About"
      aria-labelledby="about-section-heading"
    >
      <h2 className="section-display-title" id="about-section-heading">
        About Me
      </h2>

      <div className="about-container-inner">
        <div className="about-intro">
          <h2 className="about-title" id="about-title">
            <span className="about-title-greeting">Hi, I'm</span>
            <span>
              {PROFILE.greetingNameLines[0]}
              <br />
              {PROFILE.greetingNameLines[1]}
            </span>
          </h2>
          <a href="#Contact" className="about-action about-action-primary">
            <MessageSquare size={17} />
            <span>Hubungi Saya</span>
          </a>
        </div>

        <div
          ref={stageRef}
          className="about-portrait-stage"
          aria-label="Portrait with Scarface Crimson Gold hover effect"
          onPointerDown={(e) => {
            updateSpotlight(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            updateSpotlight(e.clientX, e.clientY);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'touch') return;
            endSpotlight(0);
          }}
          onTouchStart={(e) => {
            const touch = e.touches?.[0];
            if (touch) updateSpotlight(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches?.[0];
            if (touch) updateSpotlight(touch.clientX, touch.clientY);
          }}
          onTouchEnd={() => {
            endSpotlight(1200);
          }}
          onTouchCancel={() => {
            endSpotlight(600);
          }}
        >
          <div className="about-portrait-glow" />
          <div className="about-portrait">
            <SkeletonImage
              className="about-person-image"
              src={PROFILE.photoUrl}
              alt={PROFILE.fullName}
              draggable={false}
            />
            <SkeletonImage
              className="about-spider-image"
              src={PROFILE.hoverPhotoUrl || PROFILE.photoUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </div>
          <span className="about-portrait-orbit about-portrait-orbit-one" />
          <span className="about-portrait-orbit about-portrait-orbit-two" />
          <span className="about-portrait-spark" />
        </div>

        <div className="about-bio">
          <p>
            Saya adalah <strong>{PROFILE.aboutBioLeadBold}</strong> {PROFILE.aboutBio1}
          </p>
          <p>{PROFILE.aboutBio2}</p>
          <a href="#Portofolio" className="about-action about-action-secondary">
            <Code2 size={17} />
            <span>Lihat Projek</span>
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
