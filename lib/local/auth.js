// Edge-safe bits shared with middleware.
export const COOKIE = 'sln_session';

export const isLocalMode = () => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !u || u.includes('YOUR-PROJECT');
};
