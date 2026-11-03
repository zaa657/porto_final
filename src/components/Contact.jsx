import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  ArrowUpRight,
  ImagePlus,
} from 'lucide-react';
import { SkeletonImage } from './SkeletonImage';
import { PROFILE } from '../data/portfolioData';
import { useSound } from '../context/SoundContext';

const COMMENTS_STORAGE_KEY = 'ejaathala-portfolio-comments';
const COOLDOWN_SECONDS = 30;

const INITIAL_COMMENTS = [
  {
    id: 'seed-1',
    name: 'Manny Ribera',
    message: 'Portofolio 3D-nya gila bro! The World Is Yours 🔥',
    photo: '',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
  },
  {
    id: 'seed-2',
    name: 'Elvira Hancock',
    message: 'Desain Dark Luxury Crimson & Gold-nya sangat elegan dan responsif!',
    photo: '',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
];

function loadSavedComments() {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return INITIAL_COMMENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_COMMENTS;
  } catch {
    return INITIAL_COMMENTS;
  }
}

function formatRelativeTime(iso) {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Baru saja';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

function formatCooldown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resizeAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia'));
          return;
        }
        canvas.width = 128;
        canvas.height = 128;
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          128,
          128
        );
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function Contact() {
  const { playSfx } = useSound();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [msgError, setMsgError] = useState('');

  const [comments, setComments] = useState(() => loadSavedComments());
  const [commentForm, setCommentForm] = useState({
    name: '',
    message: '',
    photo: '',
    photoName: '',
  });
  const [commentError, setCommentError] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCommentError('Pilih file gambar yang valid.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCommentError('Ukuran foto maksimal 5 MB.');
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await resizeAvatarFile(file);
      setCommentForm((prev) => ({ ...prev, photo: dataUrl, photoName: file.name }));
      setCommentError('');
    } catch {
      setCommentError('Foto tidak dapat dibaca. Coba pilih gambar lain.');
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    setCommentError('');
    const name = commentForm.name.trim();
    const message = commentForm.message.trim();
    if (!name || !message) return;

    setPostingComment(true);
    setTimeout(() => {
      const newComment = {
        id: `c-${Date.now()}`,
        name,
        message,
        photo: commentForm.photo || '',
        createdAt: new Date().toISOString(),
      };
      const updated = [newComment, ...comments].slice(0, 100);
      setComments(updated);
      try {
        localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      setPostingComment(false);
      setCooldown(COOLDOWN_SECONDS);
      setCommentForm({ name: '', message: '', photo: '', photoName: '' });
      playSfx('success');
    }, 350);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setMsgError('');
    setSendingMsg(true);

    setTimeout(() => {
      setSendingMsg(false);
      setMsgSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      playSfx('success');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#dc2626', '#f59e0b', '#fbbf24', '#fb7185'],
        });
      } catch {}
      setTimeout(() => setMsgSuccess(false), 5000);
    }, 500);
  };

  return (
    <section
      className="contact-root-section"
      id="Contact"
      aria-labelledby="contact-section-heading"
    >
      <div className="contact-container-inner">
        <h2 className="section-display-title" id="contact-section-heading">
          Hubungi saya
        </h2>

        <div className="contact-main-grid contact-layout">
          <div className="contact-panel contact-message-panel">
            <h2 className="contact-section-title">Hubungi</h2>
            <p className="contact-panel-intro">
              Ada yang mau didiskusikan? Langsung kirim pesan aja ya...
            </p>

            <form onSubmit={handleContactSubmit} className="contact-actual-form">
              <div className="contact-form-field">
                <label htmlFor="user-name">Nama</label>
                <div className="contact-input-wrap">
                  <User size={17} aria-hidden="true" />
                  <input
                    id="user-name"
                    name="name"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Nama Anda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="contact-form-field">
                <label htmlFor="user-email">Email</label>
                <div className="contact-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    id="user-email"
                    name="email"
                    type="email"
                    required
                    maxLength={320}
                    placeholder="Email Anda"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="contact-form-field">
                <label htmlFor="user-msg">Pesan</label>
                <div className="contact-input-wrap contact-textarea-wrap">
                  <MessageSquare size={17} aria-hidden="true" />
                  <textarea
                    id="user-msg"
                    name="message"
                    rows={4}
                    required
                    maxLength={5000}
                    placeholder="Pesan Anda"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" disabled={sendingMsg} className="contact-submit-btn">
                <Send size={16} aria-hidden="true" />
                <span>{sendingMsg ? 'Mengirim...' : 'Kirim Pesan'}</span>
              </button>

              {msgError && (
                <p className="contact-comment-error" role="alert">
                  {msgError}
                </p>
              )}

              {msgSuccess && (
                <div className="contact-success-toast" role="status">
                  <CheckCircle2 size={18} />
                  <span>Pesan berhasil dikirim. Terima kasih!</span>
                </div>
              )}
            </form>

            <div className="contact-find-me">
              <h3>FIND ME</h3>
              <div className="contact-social-grid">
                {PROFILE.socials.map((soc) => (
                  <a
                    key={soc.name}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`contact-social-card contact-social-card--${soc.name.toLowerCase()}`}
                  >
                    <span className="contact-social-icon-box">
                      <SkeletonImage
                        className={`contact-social-logo contact-social-logo--${soc.name.toLowerCase()}`}
                        src={soc.logo}
                        alt=""
                      />
                    </span>
                    <span className="contact-social-text">
                      <span className="contact-social-label">{soc.label}</span>
                      <span className="contact-social-sub">{soc.sub}</span>
                    </span>
                    <ArrowUpRight size={16} className="contact-social-arrow" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="contact-comments-panel">
            <div className="contact-comments-header">
              <span className="contact-comments-icon">
                <MessageSquare size={19} />
              </span>
              <h2>
                Komentar <span>({comments.length})</span>
              </h2>
            </div>

            <form onSubmit={handleCommentSubmit} className="contact-comment-form">
              <div className="contact-form-field">
                <label htmlFor="comment-name">Nama</label>
                <input
                  id="comment-name"
                  type="text"
                  required
                  maxLength={50}
                  placeholder="Masukkan nama kamu"
                  value={commentForm.name}
                  onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                />
              </div>

              <div className="contact-form-field">
                <label htmlFor="comment-message">Komentar</label>
                <textarea
                  id="comment-message"
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Tulis komentar kamu di sini..."
                  value={commentForm.message}
                  onChange={(e) => setCommentForm({ ...commentForm, message: e.target.value })}
                />
              </div>

              <div className="contact-form-field">
                <label htmlFor="comment-photo">Foto Profil (opsional)</label>
                <label className="contact-photo-picker" htmlFor="comment-photo">
                  <ImagePlus size={17} aria-hidden="true" />
                  <span>{commentForm.photoName || 'Pilih Foto Profil'}</span>
                </label>
                <input
                  className="contact-photo-input"
                  id="comment-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <span className="contact-photo-hint">Ukuran file maksimal 5 MB</span>
              </div>

              {commentError && (
                <p className="contact-comment-error" role="alert">
                  {commentError}
                </p>
              )}

              <button
                type="submit"
                className="contact-submit-btn"
                disabled={postingComment || cooldown > 0}
              >
                <Send size={15} aria-hidden="true" />
                <span>
                  {postingComment
                    ? 'Mengirim...'
                    : cooldown > 0
                    ? `Kirim lagi ${formatCooldown(cooldown)}`
                    : 'Kirim Komentar'}
                </span>
              </button>

              {cooldown > 0 && (
                <>
                  <div
                    className="contact-comment-cooldown"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={COOLDOWN_SECONDS}
                    aria-valuenow={cooldown}
                  >
                    <span
                      className="contact-comment-cooldown-progress"
                      style={{ width: `${(cooldown / COOLDOWN_SECONDS) * 100}%` }}
                    />
                  </div>
                  <p className="contact-comment-cooldown-label" role="status" aria-live="polite">
                    Bisa komentar lagi dalam {formatCooldown(cooldown)}
                  </p>
                </>
              )}
            </form>

            <div className="contact-comments-list" aria-live="polite">
              {comments.length ? (
                comments.map((item) => (
                  <article key={item.id} className="contact-comment-item">
                    {item.photo ? (
                      <SkeletonImage className="contact-comment-avatar" src={item.photo} alt="" />
                    ) : (
                      <span className="contact-comment-avatar contact-comment-avatar-fallback">
                        <User size={17} aria-hidden="true" />
                      </span>
                    )}
                    <div className="contact-comment-content">
                      <div className="contact-comment-meta">
                        <strong>{item.name}</strong>
                        <time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time>
                      </div>
                      <p>{item.message}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="contact-comments-empty">Belum ada komentar. Jadilah yang pertama!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
