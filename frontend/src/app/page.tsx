import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroAnimatedTitle } from '@/components/HeroAnimatedTitle';
import { HeroParallaxVideo } from '@/components/HeroParallaxVideo';
import { ItineraryBuilder } from '@/components/ItineraryBuilder';
import { CuratedDirectory } from '@/components/CuratedDirectory';
import { ScrollToHeroOnRefresh } from '@/components/ScrollToHeroOnRefresh';
import { API_BASE } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Journi — Smarter Journeys. Better Choices.',
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

const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

async function getAllExperiences(): Promise<ExperienceData[]> {
  try {
    const res = await fetch(`${API_BASE}/experiences/catalog?limit=100`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        return data.data
          .filter((e: any) => !EXCLUDED_CITIES.has(e.city?.toLowerCase()))
          .map((e: any) => ({
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
    }
  } catch (err) {
    console.error('Failed to fetch catalog experiences:', err);
  }
  return [];
}

export default async function HomePage() {
  const experiences = await getAllExperiences();

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      <ScrollToHeroOnRefresh />
      {/* ─── SECTION 1: FULLSCREEN CINEMATIC HERO ─── */}
      <section id="hero" className="relative w-screen h-screen min-h-[680px] overflow-hidden flex flex-col items-center justify-center select-none">
        {/* Parallax Background Video (scale 1.0 -> 1.15 and cinematic fade out via IntersectionObserver + CSS transform) */}
        <HeroParallaxVideo />

        {/* Animated Title in "Corn Font" Style */}
        <div className="relative z-10 w-full flex items-center justify-center">
          <HeroAnimatedTitle />
        </div>

        {/* Subtitle statement */}
        <div className="relative z-10 mt-4 text-center px-4">
          <p className="text-white/80 text-xs sm:text-sm tracking-[0.22em] uppercase font-mono max-w-xl mx-auto drop-shadow-md">
            Private culinary lineages &bull; Master ateliers &bull; Centuries of living craft
          </p>
        </div>
      </section>

      {/* ─── SECTION 2: EXACT CURATED EXPERIENCES DIRECTORY FROM SCREENSHOT ─── */}
      <div id="curated-experiences" className="relative scroll-mt-16 pt-16 pb-28 bg-[#F5F1E6]">
        {/* Subtle Ambient Sage/Teal Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-96 bg-[#A69B80]/10 blur-[120px] rounded-full pointer-events-none" />

        {/* ─── Editorial Header (Exact SS Format) ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="border-b border-[#C4A265] pb-10">
            <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4 sm:mb-5">
              <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
              Our Curated Registry
            </div>
            <h2 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-[60px] tracking-wide text-[#2C2C2C] leading-normal py-1">
              A Living Catalogue
            </h2>
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
        />
      </div>

      {/* ─── SECTION 3: ITINERARY BUILDER ATELIER ─── */}
      <ItineraryBuilder />
    </div>
  );
}
