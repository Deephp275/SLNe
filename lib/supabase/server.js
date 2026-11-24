import { createClient } from '@supabase/supabase-js';

// Public, anon-key client for server-side reads (RLS limits it to published/public data).
export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes('YOUR-PROJECT')) return null;
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}
