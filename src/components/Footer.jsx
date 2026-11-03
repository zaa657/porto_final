import React from 'react';
import { Terminal, ArrowUp } from 'lucide-react';
import { GitHubIcon, InstagramIcon, TikTokIcon } from './Hero';
import { PROFILE } from '../data/portfolioData';

export function Footer() {
  return (
    <footer className="footer-root">
      <div className="footer-container">
        <div className="footer-top-row">
          <div className="footer-brand-wrap">
            <div className="footer-logo">
              <Terminal size={18} className="text-accent-icon" />
              <span className="footer-brand-title">{PROFILE.brand}</span>
            </div>
            <p className="footer-tagline">{PROFILE.footerTagline}</p>
          </div>

          <div className="footer-nav-col">
            <span className="footer-col-heading">Navigasi</span>
            <div className="footer-links-list">
              <a href="#Home">Beranda</a>
              <a href="#About">Tentang Saya</a>
              <a href="#Portofolio">Portofolio</a>
              <a href="#Contact">Kontak</a>
            </div>
          </div>

          <div className="footer-nav-col">
            <span className="footer-col-heading">Terhubung</span>
            <div className="footer-social-row">
              <a
                href={PROFILE.socials[2].url}
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
              >
                <GitHubIcon size={16} />
              </a>
              <a
                href={PROFILE.socials[0].url}
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href={PROFILE.socials[1].url}
                target="_blank"
                rel="noopener noreferrer"
                title="TikTok"
              >
                <TikTokIcon size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p className="footer-copyright">
            © {new Date().getFullYear()} {PROFILE.fullName}. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="footer-back-to-top"
          >
            <span>Kembali ke Atas</span>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
