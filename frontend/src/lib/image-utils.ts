export const SUPABASE_CDN_PREFIX =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvsnmwznonupjypacswj.supabase.co') +
  '/storage/v1/object/public/catalog-images';

export const FALLBACK_EXPERIENCE_IMAGE =
  'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=80';

export function resolveExperienceImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return FALLBACK_EXPERIENCE_IMAGE;
  }
  const clean = url.trim();

  // If already a full URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.includes('thumb.wikimedia.org')) {
      return clean.replace('thumb.wikimedia.org', 'upload.wikimedia.org');
    }
    return clean;
  }

  // If seasonal-images
  if (clean.includes('seasonal-images/')) {
    const subPath = clean.slice(clean.indexOf('seasonal-images/'));
    return `/${subPath.replace(/^\/+/, '')}`;
  }

  // If relative path like "/catalog-images/..." or "catalog-images/..."
  if (clean.includes('catalog-images/')) {
    const subPath = clean.slice(clean.indexOf('catalog-images/') + 'catalog-images/'.length);
    return `${SUPABASE_CDN_PREFIX}/${subPath}`;
  }

  if (clean.includes('trip-memories/')) {
    const subPath = clean.slice(clean.indexOf('trip-memories/') + 'trip-memories/'.length);
    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvsnmwznonupjypacswj.supabase.co';
    return `${supabaseBase}/storage/v1/object/public/trip-memories/${subPath}`;
  }

  if (clean.startsWith('/')) {
    return clean;
  }

  return `${SUPABASE_CDN_PREFIX}/${clean}`;
}
