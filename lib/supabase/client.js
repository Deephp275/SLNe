import { createBrowserClient } from '@supabase/ssr';
import { localClient } from '../local/client';

export const isConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR-PROJECT');

let client;
export function supabaseBrowser() {
  if (!client) client = !isConfigured() ? localClient() : createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
