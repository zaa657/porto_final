const STORE_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1c3d9b323790b';
const NTFY_DB_TOPIC = 'thalaa-porto-comments-db-v1';

async function fetchStoredComments() {
  const map = new Map();

  try {
    const res = await fetch(STORE_URL, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      const list = json?.data?.comments;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.id && item.name && item.message) {
            map.set(item.id, item);
          }
        }
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
              map.set(parsed.id, parsed);
            }
          }
        } catch {}
      }
    }
  } catch {}

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const comments = await fetchStoredComments();
    return res.status(200).json({ comments });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const name = String(body?.name || '').trim().slice(0, 50);
      const message = String(body?.message || '').trim().slice(0, 500);
      const photo = String(body?.photo || '');
      const id = String(body?.id || `c-${Date.now()}`);
      const createdAt = body?.createdAt || new Date().toISOString();

      if (!name || !message) {
        return res.status(400).json({ error: 'Nama dan komentar wajib diisi.' });
      }

      const newComment = { id, name, message, photo, createdAt };
      const existing = await fetchStoredComments();
      const mergedMap = new Map();
      mergedMap.set(newComment.id, newComment);
      for (const c of existing) {
        if (!mergedMap.has(c.id)) mergedMap.set(c.id, c);
      }
      const updated = Array.from(mergedMap.values())
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 100);

      await fetch(STORE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'ejaathala-comments',
          data: { comments: updated },
        }),
      }).catch(() => {});

      return res.status(200).json({ comment: newComment, comments: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Gagal menyimpan komentar.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
