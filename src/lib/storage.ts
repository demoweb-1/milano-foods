import { supabase } from '@/lib/supabase';

const PRODUCT_BUCKET = 'product-images';
const SITE_ASSET_BUCKET = 'site-assets';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WebP, and GIF files are allowed.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be under 5 MB.';
  }
  return null;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `logo.${ext}`;
  const { error } = await supabase.storage.from(SITE_ASSET_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(SITE_ASSET_BUCKET).getPublicUrl(path);
  // Cache-bust so the new logo shows immediately everywhere
  return `${data.publicUrl}?t=${Date.now()}`;
}

const CAKE_BUCKET = 'cake-images';

export async function uploadCakeImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(CAKE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(CAKE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
