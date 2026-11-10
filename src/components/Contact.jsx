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
const NTFY_DB_TOPIC = 'thalaa-porto-comments-db-v1';
const COOLDOWN_SECONDS = 30;

function mergeCommentLists(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (
        item &&
        item.id &&
        item.id !== 'seed-1' &&
        item.id !== 'seed-2' &&
        item.name &&
        item.message
      ) {
        const existing = map.get(item.id);
        if (!existing || (!existing.photo && item.photo)) {
          map.set(item.id, item);
        }
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 100);
}

function loadSavedComments() {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return mergeCommentLists(parsed);
  } catch {
    return [];
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
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          64,
          64
        );
        resolve(canvas.toDataURL('image/jpeg', 0.65));
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
    let active = true;

    async function syncGlobalComments() {
      const remoteItems = [];

      try {
        const apiRes = await fetch('/api/comments', { headers: { Accept: 'application/json' } });
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (Array.isArray(data?.comments)) {
            remoteItems.push(...data.comments);
          }
        }
      } catch {}

      try {
        const ntfyRes = await fetch(`https://ntfy.sh/${NTFY_DB_TOPIC}/json?poll=1&since=all`);
        if (ntfyRes.ok) {
          const text = await ntfyRes.text();
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const evt = JSON.parse(line);
              if (evt.event === 'message' && evt.message) {
                const parsed = JSON.parse(evt.message);
                if (parsed && parsed.id && parsed.name && parsed.message) {
                  remoteItems.push(parsed);
                }
              }
            } catch {}
          }
        }
      } catch {}

      if (!active) return;

      // Jika di localStorage perangkat ini ada komentar lama yang belum ada di server, otomatis unggah ke server
      const localItems = loadSavedComments();
      const remoteIds = new Set(remoteItems.map((item) => item.id));
      for (const localItem of localItems) {
        if (localItem?.id && !remoteIds.has(localItem.id)) {
          fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localItem),
          }).catch(() => {});

          const payload = JSON.stringify(localItem);
          const streamItem =
            payload.length <= 3800 ? payload : JSON.stringify({ ...localItem, photo: '' });
          fetch(`https://ntfy.sh/${NTFY_DB_TOPIC}`, {
            method: 'POST',
            body: streamItem,
          }).catch(() => {});
        }
      }

      if (remoteItems.length === 0 && localItems.length === 0) return;

      setComments((prev) => {
        const merged = mergeCommentLists(remoteItems, prev);
        try {
          localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }

    syncGlobalComments();

    let es = null;
    try {
      es = new EventSource(`https://ntfy.sh/${NTFY_DB_TOPIC}/sse`);
      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (evt.event === 'message' && evt.message) {
            const incoming = JSON.parse(evt.message);
            if (incoming && incoming.id && incoming.name && incoming.message) {
              setComments((prev) => {
                const alreadyExists = prev.some((c) => c.id === incoming.id);
                const merged = mergeCommentLists([incoming], prev);
                try {
                  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(merged));
                } catch {}
                if (!alreadyExists && typeof window !== 'undefined' && 'Notification' in window) {
                  if (Notification.permission === 'granted') {
                    try {
                      new Notification(`Komentar Baru dari ${incoming.name}`, {
                        body: incoming.message,
                        icon: '/favicon.svg',
                      });
                    } catch {}
                  }
                }
                return merged;
              });
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      active = false;
      if (es) es.close();
    };
  }, []);

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

  const notifyCommentToPhone = (name, message) => {
    const targetEmail = PROFILE.contactEmail || 'zaatala3@gmail.com';
    const ntfyTopic = PROFILE.ntfyTopic || 'thalaa-porto-notif';
    const waktu = new Date().toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // 1. Instant Push Notification ke HP via ntfy.sh
    fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`, {
      method: 'POST',
      headers: {
        Title: `Komentar Baru dari ${name}`,
        Priority: 'high',
        Tags: 'speech_balloon,sparkles',
        Click: 'https://www.thalaa.my.id/#Contact',
      },
      body: `${name}: "${message}" (${waktu})`,
    }).catch(() => {});

    // 2. Notifikasi ke aplikasi Gmail di HP via FormSubmit
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        Tipe: 'Komentar Baru di Portofolio',
        Nama: name,
        Komentar: message,
        Waktu: waktu,
        _subject: `💬 Komentar Baru di Portofolio dari ${name}`,
        _template: 'table',
        _captcha: 'false',
      }),
    }).catch(() => {});
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError('');
    const name = commentForm.name.trim();
    const message = commentForm.message.trim();
    if (!name || !message) return;

    setPostingComment(true);
    notifyCommentToPhone(name, message);

    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      message,
      photo: commentForm.photo || '',
      createdAt: new Date().toISOString(),
    };

    const updated = mergeCommentLists([newComment], comments);
    setComments(updated);
    try {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Simpan ke stream global ntfy agar langsung muncul real-time di semua perangkat
    const ntfyPayload = JSON.stringify(newComment);
    const streamItem =
      ntfyPayload.length <= 3800 ? ntfyPayload : JSON.stringify({ ...newComment, photo: '' });
    fetch(`https://ntfy.sh/${NTFY_DB_TOPIC}`, {
      method: 'POST',
      body: streamItem,
    }).catch(() => {});

    // Simpan ke penyimpanan permanen via Vercel API
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment),
    }).catch(() => {});

    setTimeout(() => {
      setPostingComment(false);
      setCooldown(COOLDOWN_SECONDS);
      setCommentForm({ name: '', message: '', photo: '', photoName: '' });
      playSfx('success');
      try {
        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#9333ea', '#a855f7', '#c084fc'],
        });
      } catch {}
    }, 300);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim();
    const message = formData.message.trim();
    if (!name || !email || !message) return;

    setMsgError('');
    setMsgSuccess(false);
    setSendingMsg(true);

    try {
      const targetEmail = PROFILE.contactEmail || 'zaatala3@gmail.com';
      const ntfyTopic = PROFILE.ntfyTopic || 'thalaa-porto-notif';

      // Kirim juga ke ntfy agar muncul notif instan di HP
      fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`, {
        method: 'POST',
        headers: {
          Title: `Pesan Diskusi dari ${name}`,
          Priority: 'high',
          Tags: 'incoming_envelope,fire',
          Click: `mailto:${email}`,
        },
        body: `Dari: ${name} (${email})\nPesan: ${message}`,
      }).catch(() => {});

      const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          Nama: name,
          Email: email,
          Pesan: message,
          _replyto: email,
          _subject: `Pesan Portofolio Baru dari ${name}`,
          _template: 'table',
          _captcha: 'false',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === 'false' || data.success === false) {
        const rawMsg = String(data.message || '');
        if (rawMsg.toLowerCase().includes('activation')) {
          throw new Error(
            'Email aktivasi sudah dikirim ke zaatala3@gmail.com! Silakan buka Inbox/Spam Gmail Anda lalu klik tombol "Activate Form" (cukup 1 kali saja).'
          );
        }
        throw new Error(data.message || 'Gagal mengirim pesan otomatis. Silakan coba lagi beberapa saat.');
      }

      setMsgSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      playSfx('success');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#9333ea', '#a855f7', '#c084fc', '#e9d5ff'],
        });
      } catch {}
      setTimeout(() => setMsgSuccess(false), 6000);
    } catch (err) {
      setMsgError(
        err instanceof Error && err.message
          ? err.message
          : 'Gagal mengirim pesan otomatis. Silakan coba lagi beberapa saat.'
      );
    } finally {
      setSendingMsg(false);
    }
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
