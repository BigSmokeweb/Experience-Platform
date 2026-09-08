import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '@/lib/api-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '50';

  // Build backend query
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  params.set('page', page);
  params.set('limit', limit);

  try {
    const res = await fetch(`${API_BASE}/experiences/catalog?${params}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60s
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
    // Backend unreachable
  }

  // Fallback: empty result
  return NextResponse.json({
    data: [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false },
  });
}
