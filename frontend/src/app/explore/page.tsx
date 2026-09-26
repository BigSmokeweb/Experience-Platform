import type { Metadata } from 'next';
import Link from 'next/link';
import { CuratedDirectory } from '@/components/CuratedDirectory';
import { LivingCatalogueHeader } from '@/components/LivingCatalogueHeader';
import { API_BASE } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Curated Directory — Journi',
  description: 'Verified culinary walks, master artisan workshops, and historic trails across India with Journi.',
};

const CATEGORIES = [
  { label: 'All Experiences', value: '' },
  { label: 'Culinary & Food', value: 'FOOD' },
  { label: 'Heritage & Culture', value: 'CULTURE' },
  { label: 'Artisan Workshops', value: 'WORKSHOPS' },
  { label: 'Outdoor & Adventure', value: 'ADVENTURE' },
  { label: 'Off the Map', value: 'HIDDEN_GEMS' },
  { label: 'Nightlife & Music', value: 'NIGHTLIFE' },
];

const CITIES = [
  { label: 'All Cities', value: '' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Thane', value: 'Thane' },
  { label: 'Navi Mumbai', value: 'Navi Mumbai' },
  { label: 'Powai', value: 'Powai' },
  { label: 'Panvel', value: 'Panvel' },
  { label: 'Kalyan-Dombivli', value: 'Kalyan-Dombivli' },
  { label: 'Kanjur Marg', value: 'Kanjur Marg' },
];

import type { ExperienceData } from '@/types/experience';
import catalogDataset from '@/lib/catalog-dataset.json';
import { resolveExperienceImageUrl } from '@/lib/image-utils';

const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

function isSeasonalItem(e: any): boolean {
  return Boolean(
    e.isSeasonal === true ||
    e.metadata?.isSeasonal === true ||
    (typeof e.id === 'string' && e.id.startsWith('seasonal-')) ||
    e.category === 'Diwali' ||
    e.category === 'Ganesh Chaturthi' ||
    e.category === 'Navaratri' ||
    e.metadata?.festival ||
    e.metadata?.seasonalCategory ||
    (Array.isArray(e.tags) && e.tags.includes('seasonal'))
  );
}

const catalogMap = new Map<string, any>((catalogDataset as any[]).map((c: any) => [c.id, c]));

async function getAllExperiences(): Promise<ExperienceData[]> {
  try {
    const res = await fetch(`${API_BASE}/experiences/catalog?limit=500`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data
          .filter((e: any) => !EXCLUDED_CITIES.has(e.city?.toLowerCase()) && !isSeasonalItem(e))
          .map((e: any) => {
            const localMatch = catalogMap.get(e.id);
            const rawCover =
              e.cover ||
              e.metadata?.cover ||
              (e.mediaUrls?.[0] ?? '') ||
              e.metadata?.coverRow ||
              localMatch?.cover ||
              (localMatch?.mediaUrls?.[0] ?? '');
            const rawMedia =
              e.mediaUrls && e.mediaUrls.length > 0
                ? e.mediaUrls
                : localMatch?.mediaUrls && localMatch.mediaUrls.length > 0
                ? localMatch.mediaUrls
                : rawCover
                ? [rawCover]
                : [];
            const resolvedCover = resolveExperienceImageUrl(rawCover);
            const resolvedMedia = rawMedia.map(resolveExperienceImageUrl);
            return {
              ...e,
              title: e.title || e.name || 'Local Experience',
              cover: resolvedCover,
              mediaUrls: resolvedMedia.length > 0 ? resolvedMedia : [resolvedCover],
              provider: e.provider
                ? {
                    businessName: e.provider.businessName ?? undefined,
                    verificationStatus: e.provider.verificationStatus ?? undefined,
                  }
                : undefined,
            };
          });
      }
    }
  } catch (err) {
    // Remote backend not reachable (e.g. on Vercel)
  }

  // Server-side dataset fallback (instant on Vercel, zero client bundle bloat)
  return (catalogDataset as any[])
    .filter((e) => !EXCLUDED_CITIES.has(e.city?.toLowerCase()) && !isSeasonalItem(e))
    .map((e) => ({
      ...e,
      title: e.title || e.name || 'Local Experience',
      provider: e.provider
        ? {
            businessName: e.provider.businessName ?? undefined,
            verificationStatus: e.provider.verificationStatus ?? undefined,
          }
        : undefined,
    }));
}

export default async function ExplorePage() {
  const experiences = await getAllExperiences();

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen pt-28 pb-24 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      {/* ─── Editorial Header with Apple-Style Clip-Path Word Reveal ─── */}
      <LivingCatalogueHeader as="h1" />

      {/* ─── Curated Directory with Instant Client-Side Category Buttons ─── */}
      <CuratedDirectory
        initialExperiences={experiences}
        categories={CATEGORIES}
        cities={CITIES}
        targetId="explore-directory"
      />
    </div>
  );
}
