import React, { useEffect, useState } from 'react';
import { Music, ArrowUpRight } from 'lucide-react';
import { PROFILE } from '../data/portfolioData';

export function SpotifySection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const timer = window.setTimeout(() => setLoaded(true), 2200);
    return () => window.clearTimeout(timer);
  }, [PROFILE.spotifyEmbedUrl]);

  return (
    <section className="spotify-section" aria-labelledby="spotify-title">
      <div className="spotify-card">
        <div className="spotify-copy">
          <h2 id="spotify-title">
            A little music.
            <br />
            <span>A lot of ideas.</span>
          </h2>
          <p className="spotify-description">
            Musik yang menemani proses saya mengubah ide menjadi sesuatu yang nyata. Intip playlist
            yang sedang sering saya putar.
          </p>
          <a
            className="spotify-open-link"
            href={PROFILE.spotifyPlaylistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Music size={17} />
            <span>Daily Rotation di Spotify</span>
            <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="spotify-player-frame">
          {!loaded && (
            <div className="spotify-player-skeleton" aria-hidden="true">
              <div className="spotify-skeleton-header">
                <span className="skeleton-block spotify-skeleton-cover" />
                <div className="spotify-skeleton-copy">
                  <span className="skeleton-block spotify-skeleton-title" />
                  <span className="skeleton-block spotify-skeleton-subtitle" />
                  <span className="skeleton-block spotify-skeleton-saved" />
                </div>
                <span className="skeleton-block spotify-skeleton-brand" />
              </div>
              <span className="skeleton-block spotify-skeleton-preview-label" />
              <div className="spotify-skeleton-tracks">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="spotify-skeleton-track">
                    <span className="skeleton-block spotify-skeleton-track-number" />
                    <div className="spotify-skeleton-track-copy">
                      <span className="skeleton-block spotify-skeleton-track-title" />
                      <span className="skeleton-block spotify-skeleton-track-artist" />
                    </div>
                    <span className="skeleton-block spotify-skeleton-track-duration" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <iframe
            className="spotify-embed"
            title="Spotify playlist: Daily Rotation"
            src={PROFILE.spotifyEmbedUrl}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </section>
  );
}
