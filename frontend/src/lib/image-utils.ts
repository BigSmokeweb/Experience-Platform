export const SUPABASE_CDN_PREFIX =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvsnmwznonupjypacswj.supabase.co') +
  '/storage/v1/object/public/catalog-images';

export const FALLBACK_EXPERIENCE_IMAGE =
  'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=80';

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  FOOD: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  CULTURE: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80',
  SHOPPING: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80',
  NIGHTLIFE: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
  ADVENTURE: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  HIDDEN_GEMS: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  EVENTS: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  WORKSHOPS: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
};

export function getCategoryFallbackImage(category?: string): string {
  if (!category) return FALLBACK_EXPERIENCE_IMAGE;
  const clean = category.toUpperCase().trim().replace(/\s+/g, '_');
  return CATEGORY_FALLBACK_IMAGES[clean] || FALLBACK_EXPERIENCE_IMAGE;
}

export function resolveExperienceImageUrl(url?: string | null, category?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getCategoryFallbackImage(category);
  }
  const clean = url.trim();

  // If already a full URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.includes('thumb.wikimedia.org')) {
      return clean.replace('thumb.wikimedia.org', 'upload.wikimedia.org');
    }
    return clean;
  }

  // If seasonal-images (served via Supabase CDN in production and local)
  if (clean.includes('seasonal-images/')) {
    const subPath = clean.slice(clean.indexOf('seasonal-images/'));
    return `${SUPABASE_CDN_PREFIX}/${subPath}`;
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
