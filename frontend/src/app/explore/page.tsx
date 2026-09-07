import type { Metadata } from 'next';
import Link from 'next/link';
import { CuratedDirectory } from '@/components/CuratedDirectory';
import { API_BASE } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Curated Directory — Experience Platform',
  description: 'Verified culinary walks, master artisan workshops, and historic trails across India.',
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

import { ALL_EXPERIENCES } from '@/lib/experiences-data';

const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

async function getAllExperiences() {
  try {
    const res = await fetch(`${API_BASE}/experiences/search?limit=50`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        const cleanRemote = data.data.filter(
          (e: any) => !EXCLUDED_CITIES.has(e.city?.toLowerCase())
        );
        const remoteIds = new Set(cleanRemote.map((e: any) => e.id));
        return [
          ...cleanRemote,
          ...ALL_EXPERIENCES.filter(
            (e) => !remoteIds.has(e.id) && !EXCLUDED_CITIES.has(e.city?.toLowerCase())
          ),
        ];
      }
    }
  } catch {
    // Fallback to complete catalog
  }
  return ALL_EXPERIENCES.filter((e) => !EXCLUDED_CITIES.has(e.city?.toLowerCase()));
}

export default async function ExplorePage() {
  const experiences = await getAllExperiences();

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen pt-28 pb-24 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      {/* ─── Editorial Header ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="border-b border-[#C4A265] pb-10">
          <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4 sm:mb-5">
            <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
            Our Curated Registry
          </div>
          <h1 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-[60px] tracking-wide text-[#2C2C2C] leading-normal py-1">
            A Living Catalogue
          </h1>
          <p className="text-[#5C6460] text-sm sm:text-base mt-5 sm:mt-6 max-w-2xl font-light leading-relaxed">
            Dawn walks through centuries-old ateliers. Culinary traditions held in family kitchens since the Mughal courts. Each experience verified in person, on site.
          </p>
        </div>
      </section>

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
