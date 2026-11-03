import React from 'react';
import { Code2, Award, Trophy } from 'lucide-react';
import { LiquidMetalBorder } from './react-bits/LiquidMetalBorder';
import { SkeletonImage } from './SkeletonImage';
import { EDUCATION, EXPERIENCE, PROJECTS, CERTIFICATES, AWARDS } from '../data/portfolioData';

const STATS = [
  { label: 'Projects', detail: 'Karya yang dibuat', value: String(PROJECTS.length), Icon: Code2 },
  {
    label: 'Certificates',
    detail: 'Skill yang divalidasi',
    value: String(CERTIFICATES.length),
    Icon: Award,
  },
  { label: 'Awards', detail: 'Pencapaian diraih', value: String(AWARDS.length), Icon: Trophy },
];

export function Experience() {
  return (
    <section className="experience-section" aria-labelledby="experience-section-heading">
      <div className="experience-container">
        <div className="experience-columns">
          <div className="experience-group">
            <h2>Education</h2>
            {EDUCATION.map((edu) => (
              <article key={edu.title} className="experience-card">
                <div className="experience-logo">
                  <SkeletonImage src={edu.logo} alt={`Logo ${edu.title}`} />
                </div>
                <div className="experience-card-copy">
                  <h3>{edu.title}</h3>
                  <p>{edu.subtitle}</p>
                  <span className="experience-date">{edu.date}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="experience-group">
            <h2>Experience</h2>
            {EXPERIENCE.map((exp) => (
              <article key={exp.title} className="experience-card">
                <div className="experience-logo">
                  <SkeletonImage src={exp.logo} alt={`Logo ${exp.title}`} />
                </div>
                <div className="experience-card-copy">
                  <h3>{exp.title}</h3>
                  <p>{exp.subtitle}</p>
                  {exp.date && <span className="experience-date">{exp.date}</span>}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="experience-stats" aria-label="Portfolio statistics">
          {STATS.map(({ label, detail, value, Icon }) => (
            <article key={label} className="experience-stat-card">
              <LiquidMetalBorder />
              <div className="experience-stat-top">
                <span className="experience-stat-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <strong>{value}</strong>
              </div>
              <h3>{label}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
