import { Query } from './query';
import { runQuery } from './engine';

// Server-side stand-in for the Supabase public client (reads straight from data/db.json)
export const localServerClient = () => ({ from: (t) => new Query(t, (p) => Promise.resolve(runQuery(p))) });