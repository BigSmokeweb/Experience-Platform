import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '@/lib/api-client';
import catalogDataset from '@/lib/catalog-dataset.json';
import seasonalDataset from '@/lib/seasonal-dataset.json';
import { resolveExperienceImageUrl } from '@/lib/image-utils';

function normalizeItem(e: any) {
  const rawCover = e.cover || e.metadata?.cover || (e.mediaUrls?.[0] ?? '');
  const rawMedia = e.mediaUrls && e.mediaUrls.length > 0 ? e.mediaUrls : (e.cover ? [e.cover] : []);
  const resolvedCover = resolveExperienceImageUrl(rawCover);
  const resolvedMedia = rawMedia.map(resolveExperienceImageUrl);
  return {
    ...e,
    cover: resolvedCover,
    mediaUrls: resolvedMedia.length > 0 ? resolvedMedia : [resolvedCover],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
  const seasonal = searchParams.get('seasonal') === 'true' || searchParams.get('isSeasonal') === 'true';

  // 1. If remote backend API is available, try it first
  if (API_BASE && !API_BASE.includes('localhost')) {
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (seasonal) params.set('seasonal', 'true');
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`${API_BASE}/experiences/catalog?${params}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          data.data = data.data.map(normalizeItem);
        }
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        });
      }
    } catch {
      // Backend unreachable, fallback to server dataset
    }
  }

  // 2. Server-side dataset fallback (instant, zero cold-starts, works on Vercel)
  // Seasonal experiences are exclusively shown when seasonal=true (e.g. from the seasonal banner / directory)
  let filtered = seasonal
    ? [...(seasonalDataset as any[])]
    : [...(catalogDataset as any[])];
  if (city) {
    const c = city.toLowerCase();
    filtered = filtered.filter((e) => e.city?.toLowerCase() === c);
  }
  if (category) {
    filtered = filtered.filter((e) => e.category === category);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.title?.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s) ||
        e.city?.toLowerCase().includes(s) ||
        e.area?.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit).map(normalizeItem);

  return NextResponse.json(
    {
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: offset + limit < total,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    }
  );
}
