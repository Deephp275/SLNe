import { Query } from './query';

const call = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json().then((j) => ({ ok: r.ok, ...j })));

const run = (p) => call('/api/local/db', p).then((j) => (j.error ? { data: null, error: j.error } : j)).catch(() => ({ data: null, error: { message: 'Local server not reachable' } }));

// Browser-side stand-in for the Supabase client, talking to /api/local/*
export function localClient() {
  return {
    from: (t) => new Query(t, run),
    storage: {
      from: () => ({
        upload: async (path, file) => {
          const fd = new FormData(); fd.append('file', file); fd.append('path', path);
          const r = await fetch('/api/local/upload', { method: 'POST', body: fd });
          const j = await r.json().catch(() => ({}));
          return r.ok ? { data: { path: j.path }, error: null } : { data: null, error: { message: j.error || 'Upload failed' } };
        },
        getPublicUrl: (path) => ({ data: { publicUrl: `/uploads/${path}` } }),
      }),
    },
    auth: {
      signInWithPassword: async ({ password }) => {
        const j = await call('/api/local/auth', { action: 'login', password });
        return j.ok ? { data: { user: { id: 'local-admin' } }, error: null } : { data: null, error: { message: j.error || 'Login failed' } };
      },
      signOut: async () => { await call('/api/local/auth', { action: 'logout' }); return { error: null }; },
    },
  };
}