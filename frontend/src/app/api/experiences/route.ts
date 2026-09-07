import { NextRequest, NextResponse } from 'next/server';
import { ALL_EXPERIENCES } from '@/lib/experiences-data';

const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12', 10)));

  let filtered = ALL_EXPERIENCES.filter((exp) => !EXCLUDED_CITIES.has(exp.city?.toLowerCase()));

  if (category) {
    filtered = filtered.filter((exp) => exp.category?.toLowerCase() === category.toLowerCase());
  }

  if (city) {
    filtered = filtered.filter((exp) => exp.city?.toLowerCase() === city.toLowerCase());
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (exp) =>
        exp.title?.toLowerCase().includes(q) ||
        exp.description?.toLowerCase().includes(q) ||
        exp.city?.toLowerCase().includes(q) ||
        exp.category?.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < total;

  return NextResponse.json({
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore,
    },
  });
}
