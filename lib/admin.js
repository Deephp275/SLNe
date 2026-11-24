import { supabaseBrowser } from './supabase/client';

export async function uploadImage(file, folder = 'misc') {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Please choose a JPG, PNG, WebP or GIF image');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const sb = supabaseBrowser();
  const { data, error } = await sb.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from('media').getPublicUrl(data?.path || path).data.publicUrl;
}
