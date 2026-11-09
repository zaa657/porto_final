import React, { useRef, useEffect } from 'react';
import { MessageSquare, Code2, ArrowUpRight } from 'lucide-react';
import { SkeletonImage } from './SkeletonImage';
import { PROFILE } from '../data/portfolioData';

export function About() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const sec = sectionRef.current;
    const stage = stageRef.current;
    if (!sec || !stage) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        stage.classList.toggle('is-in-view', entry.isIntersecting);
        if (!entry.isIntersecting) {
          clearTimeout(timeoutRef.current);
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
          onPointerMove={(e) => {
            const stage = stageRef.current;
            const portrait = stage?.querySelector('.about-portrait');
            if (!stage || !portrait) return;
            clearTimeout(timeoutRef.current);
            const rect = portrait.getBoundingClientRect();
            const hx = ((e.clientX - rect.left) / rect.width) * 100;
            const hy = ((e.clientY - rect.top) / rect.height) * 100;
            stage.style.setProperty('--hover-x', `${hx}%`);
            stage.style.setProperty('--hover-y', `${hy}%`);
            stage.classList.add('spider-hovered');
            stage.dataset.spiderVisible = 'true';
          }}
          onPointerLeave={() => {
            const stage = stageRef.current;
            if (!stage) return;
            delete stage.dataset.spiderVisible;
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              stage.classList.remove('spider-hovered');
            }, 7000);
          }}
        >
          <div className="about-portrait-glow" />
          <div className="about-portrait">
            <SkeletonImage
              className="about-person-image"
              src={PROFILE.photoUrl}
              alt={PROFILE.fullName}
            />
            <SkeletonImage
              className="about-spider-image"
              src={PROFILE.hoverPhotoUrl || PROFILE.photoUrl}
              alt=""
              aria-hidden="true"
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
