import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '@/lib/api-client';
import catalogDataset from '@/lib/catalog-dataset.json';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);

  // 1. If remote backend API is available, try it first
  if (API_BASE && !API_BASE.includes('localhost')) {
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`${API_BASE}/experiences/catalog?${params}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const data = await res.json();
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
  let filtered = catalogDataset as any[];
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
  const paginated = filtered.slice(offset, offset + limit);

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
