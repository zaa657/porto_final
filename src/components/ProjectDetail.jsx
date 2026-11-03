import React, { useEffect } from 'react';
import { ArrowLeft, ChevronRight, Code2 } from 'lucide-react';
import { BorderGlow } from './react-bits/BorderGlow';
import { SkeletonImage } from './SkeletonImage';
import { TECH_LOGOS } from '../data/portfolioData';

export function ProjectDetail({ project, onBack }) {
  useEffect(() => {
    const onPointerMove = (e) => {
      const root = document.documentElement;
      const x = e.clientX.toFixed(2);
      const y = e.clientY.toFixed(2);
      const ratio = e.clientX / window.innerWidth;
      root.style.setProperty('--tech-glow-x', `${x}px`);
      root.style.setProperty('--tech-glow-y', `${y}px`);
      root.style.setProperty('--tech-glow-hue', `${350 + ratio * 50}`);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.style.removeProperty('--tech-glow-x');
      document.documentElement.style.removeProperty('--tech-glow-y');
      document.documentElement.style.removeProperty('--tech-glow-hue');
    };
  }, []);

  return (
    <main className="project-detail-page">
      <div className="project-detail-inner">
        <div className="project-detail-breadcrumbs">
          <button type="button" className="project-detail-back" onClick={onBack}>
            <ArrowLeft size={20} aria-hidden="true" />
            <span>Back</span>
          </button>
          <span className="project-detail-crumb-muted">Projects</span>
          <ChevronRight size={18} aria-hidden="true" className="project-detail-crumb-chevron" />
          <span className="project-detail-crumb-current">{project.title}</span>
        </div>

        <div className="project-detail-layout">
          <div className="project-detail-copy">
            <h1 className="project-detail-title">{project.title}</h1>
            <p className="project-detail-description">{project.longDesc}</p>

            <div className="project-detail-tech">
              <h2>
                <Code2 size={20} aria-hidden="true" /> Technologies Used
              </h2>
              <div className="project-detail-tech-list">
                {project.tags.map((tag) => {
                  const logo = TECH_LOGOS[tag];
                  return (
                    <span key={tag} className="project-detail-tech-chip" data-glow>
                      {logo ? (
                        <SkeletonImage src={logo} alt="" aria-hidden="true" />
                      ) : (
                        <Code2 size={18} aria-hidden="true" />
                      )}
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {project.video || project.image ? (
            <BorderGlow
              className="project-detail-preview-glow"
              edgeSensitivity={8}
              glowColor="10 90 65"
              backgroundColor="#0d0407"
              borderRadius={20}
              glowRadius={28}
              glowIntensity={1.5}
              coneSpread={23}
              colors={['#dc2626', '#f59e0b', '#fb7185']}
            >
              <div
                className="project-detail-preview has-image"
                style={{ background: project.gradient }}
              >
                {project.video ? (
                  <video
                    className="project-detail-video"
                    src={project.video}
                    poster={project.image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <SkeletonImage src={project.image} alt={`Tampilan ${project.title}`} />
                )}
              </div>
            </BorderGlow>
          ) : (
            <div className="project-detail-preview" style={{ background: project.gradient }}>
              <div className="project-detail-preview-placeholder">
                <div className="project-detail-preview-window">
                  <span />
                  <span />
                  <span />
                </div>
                <Code2 size={54} aria-hidden="true" />
                <span>{project.categoryLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
