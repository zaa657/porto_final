import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code2, Award, Trophy, Cpu, ArrowRight, Eye, X } from 'lucide-react';
import { LiquidMetalBorder } from './react-bits/LiquidMetalBorder';
import { BorderGlow } from './react-bits/BorderGlow';
import { SkeletonImage } from './SkeletonImage';
import { PROJECTS, SKILL_CATEGORIES, CERTIFICATES, AWARDS } from '../data/portfolioData';

gsap.registerPlugin(ScrollTrigger);

const TABS = [
  { id: 'projects', label: 'Projects', icon: Code2 },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'awards', label: 'Achievements', icon: Trophy },
  { id: 'skills', label: 'Tech Stack', icon: Cpu },
];

export function Portfolio({ onOpenProject }) {
  const sectionRef = useRef(null);
  const prevTabRef = useRef(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [viewerItem, setViewerItem] = useState(null);

  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;
    if (!prev || prev === activeTab) return;

    const sec = sectionRef.current;
    const view = sec?.querySelector(`.portfolio-${activeTab}-view`);
    const cardSelector =
      activeTab === 'projects'
        ? '.portfolio-project-card'
        : activeTab === 'skills'
        ? '.portfolio-skill-card'
        : '.portfolio-cert-card';
    const cards = view?.querySelectorAll(cardSelector);
    if (!cards?.length) return;

    const isDesktop = !window.matchMedia('(max-width: 767px)').matches;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          autoAlpha: 0,
          y: 28,
          scale: 0.94,
          ...(isDesktop ? { filter: 'blur(5px)' } : {}),
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          ...(isDesktop ? { filter: 'blur(0px)' } : {}),
          duration: 0.52,
          stagger: { each: 0.065, from: 'start' },
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility,filter',
        }
      );

      const media = view.querySelectorAll(
        '.portfolio-card-thumbnail-image, .portfolio-skill-logo, .portfolio-cert-preview-image'
      );
      if (media.length) {
        gsap.fromTo(
          media,
          { scale: 0.86, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.58,
            stagger: { each: 0.055, from: 'start' },
            ease: 'back.out(1.4)',
            clearProps: 'transform,opacity,visibility',
          }
        );
      }

      const activeBtn = sec.querySelector('.portfolio-tab-btn.is-active');
      if (activeBtn) {
        gsap.fromTo(activeBtn, { scale: 0.95 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
      }
    }, sec);

    return () => ctx.revert();
  }, [activeTab]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(id);
  }, [activeTab]);

  useEffect(() => {
    if (!viewerItem) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setViewerItem(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [viewerItem]);

  return (
    <section
      ref={sectionRef}
      className="portfolio-root-section"
      id="Portofolio"
      aria-labelledby="portfolio-section-heading"
    >
      <div className="portfolio-container-inner">
        <h2 className="section-display-title" id="portfolio-section-heading">
          Portfolio
        </h2>

        <div className="portfolio-tab-bar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`portfolio-tab-btn ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={22} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'projects' && (
          <div className="portfolio-projects-view">
            <div className="portfolio-cards-grid">
              {PROJECTS.map((project) => (
                <article key={project.id} className="portfolio-project-card">
                  <LiquidMetalBorder className="portfolio-project-metal-border" />
                  <div className="portfolio-project-card-content">
                    <div
                      className="portfolio-card-thumbnail"
                      style={{ background: project.image ? '#000' : project.gradient }}
                    >
                      {project.image && (
                        <SkeletonImage
                          className="portfolio-card-thumbnail-image"
                          src={project.image}
                          alt={`Thumbnail ${project.title}`}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="portfolio-card-body">
                      <h3 className="portfolio-card-title">{project.title}</h3>
                      <p className="portfolio-card-desc">{project.description}</p>
                      <button
                        type="button"
                        className="portfolio-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProject(project.id);
                        }}
                      >
                        <span>Details</span>
                        <ArrowRight size={20} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="portfolio-skills-view">
            <div className="portfolio-skills-grid">
              {SKILL_CATEGORIES.flatMap((c) => c.skills)
                .filter((s) => s.logo)
                .map((skill) => (
                  <BorderGlow
                    key={skill.name}
                    as="article"
                    className="portfolio-skill-card"
                    edgeSensitivity={0}
                    glowColor="276 100 35"
                    backgroundColor="#0b0014"
                    borderRadius={20}
                    glowRadius={28}
                    glowIntensity={2.2}
                    coneSpread={23}
                    colors={['#290044', '#4a007a', '#6b00b3']}
                  >
                    <div className="portfolio-skill-card-content">
                      <div className="portfolio-skill-mark">
                        <SkeletonImage
                          className={`portfolio-skill-logo ${skill.logoClass || ''}`}
                          src={skill.logo}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                      <h3 className="portfolio-skill-name">{skill.name}</h3>
                    </div>
                  </BorderGlow>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="portfolio-certificates-view">
            {CERTIFICATES.length > 0 ? (
              <div className="portfolio-certificates-grid">
                {CERTIFICATES.map((cert) => (
                  <article
                    key={cert.id}
                    className="portfolio-cert-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat sertifikat ${cert.title}`}
                    onClick={() => setViewerItem(cert)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewerItem(cert);
                      }
                    }}
                  >
                    <div className="portfolio-cert-preview">
                      <SkeletonImage
                        className="portfolio-cert-preview-image"
                        src={cert.image}
                        alt={`Preview ${cert.title}`}
                        loading="lazy"
                      />
                      <span className="portfolio-cert-preview-overlay">
                        Lihat sertifikat
                        <Eye size={18} aria-hidden="true" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="portfolio-empty-state">Belum ada sertifikat yang ditampilkan.</p>
            )}
          </div>
        )}

        {activeTab === 'awards' && (
          <div className="portfolio-awards-view">
            {AWARDS.length > 0 ? (
              <div className="portfolio-certificates-grid">
                {AWARDS.map((award) => (
                  <article
                    key={award.id}
                    className="portfolio-cert-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat piagam ${award.title}`}
                    onClick={() => setViewerItem(award)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewerItem(award);
                      }
                    }}
                  >
                    <div className="portfolio-cert-preview">
                      <SkeletonImage
                        className="portfolio-cert-preview-image"
                        src={award.image}
                        alt={`Piagam ${award.title}`}
                        loading="lazy"
                      />
                      <span className="portfolio-cert-preview-overlay">
                        Lihat piagam
                        <Eye size={18} aria-hidden="true" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="portfolio-empty-state">Belum ada pencapaian yang ditampilkan.</p>
            )}
          </div>
        )}
      </div>

      {viewerItem &&
        createPortal(
          <div className="portfolio-cert-viewer-backdrop" onClick={() => setViewerItem(null)}>
            <button
              type="button"
              className="portfolio-cert-viewer-close"
              onClick={() => setViewerItem(null)}
              aria-label="Tutup sertifikat"
            >
              <X size={30} />
            </button>
            <div
              className="portfolio-cert-viewer"
              role="dialog"
              aria-modal="true"
              aria-label={viewerItem.title}
              onClick={(e) => e.stopPropagation()}
            >
              <SkeletonImage
                className="portfolio-cert-viewer-image"
                src={viewerItem.image}
                alt={viewerItem.title}
              />
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
