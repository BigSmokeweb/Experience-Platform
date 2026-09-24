import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, Clock, ShieldCheck } from 'lucide-react';
import { getCurrentSeason, SEASONS } from '@/lib/seasons';
import { API_BASE } from '@/lib/api-client';
import catalogDataset from '@/lib/catalog-dataset.json';
import { SeasonalBackButton } from '@/components/SeasonalBackButton';
import { resolveExperienceImageUrl, FALLBACK_EXPERIENCE_IMAGE } from '@/lib/image-utils';

export const metadata: Metadata = {
  title: 'Seasonal Festivals & Spots — Journi',
  description: 'Discover seasonal festivals and experiences. Location-aware recommendations powered by our deterministic scoring engine.',
};

// Default center: Mumbai
const DEFAULT_LAT = 18.922;
const DEFAULT_LNG = 72.8347;
const RADIUS_KM = 50;

interface SeasonalExperience {
  id: string;
  title: string;
  category: string;
  city: string;
  distanceKm?: number;
  priceMin: number;
  priceMax: number;
  ratingAverage: number;
  reviewCount: number;
  durationMinutes?: number;
  mediaUrls: string[];
  description?: string;
  provider?: { businessName?: string; verificationStatus?: string };
}

async function getSeasonalRecommendations(): Promise<SeasonalExperience[]> {
  // Try recommendation engine first
  try {
    const res = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        radiusKm: RADIUS_KM,
        limit: 20,
      }),
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.recommendations?.length > 0) {
        return data.recommendations.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          city: r.city,
          distanceKm: r.distanceKm,
          priceMin: r.priceMin,
          priceMax: r.priceMax,
          ratingAverage: r.ratingAverage,
          reviewCount: r.reviewCount,
          mediaUrls: (r.mediaUrls || []).map(resolveExperienceImageUrl),
          description: r.description,
        }));
      }
    }
  } catch {
    // Recommendation engine unavailable
  }

  // Fallback: use catalog dataset, sorted by rating
  const EXCLUDED = new Set(['jaipur', 'ahmedabad']);
  return (catalogDataset as any[])
    .filter((e) => !EXCLUDED.has(e.city?.toLowerCase()))
    .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0))
    .slice(0, 20)
    .map((e) => {
      const rawUrls = e.mediaUrls && e.mediaUrls.length > 0 ? e.mediaUrls : (e.cover ? [e.cover] : []);
      return {
        id: e.id,
        title: e.title || e.name || 'Local Experience',
        category: e.category,
        city: e.city,
        priceMin: e.priceMin || 0,
        priceMax: e.priceMax || 0,
        ratingAverage: e.ratingAverage || 4.5,
        reviewCount: e.reviewCount || 0,
        durationMinutes: e.durationMinutes,
        mediaUrls: rawUrls.map(resolveExperienceImageUrl),
        description: e.description,
        provider: e.provider,
      };
    });
}

function formatPrice(min?: number, max?: number): { label: string; value: string } {
  if ((!min && !max) || (min === 0 && max === 0)) {
    return { label: 'Admission', value: 'Free Public Spot' };
  }
  if (!min || min === 0) {
    return { label: 'Admission', value: 'Free Entry (Items extra)' };
  }
  if (min === max) {
    return { label: 'Est. Spend', value: `₹${min.toLocaleString()}` };
  }
  return { label: 'Est. Spend', value: `₹${min.toLocaleString()} – ₹${(max || min).toLocaleString()}` };
}

export default async function SeasonalPage() {
  const season = getCurrentSeason();
  const experiences = await getSeasonalRecommendations();

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen selection:bg-[#8B7355]/30 pt-24 pb-28">
      {/* Back Navigation with scroll restoration */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <SeasonalBackButton />
      </div>

      {/* Season & Festival Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
        <div className="border-b border-[#C4A265] pb-10">
          <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4 sm:mb-5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {season.icon} {season.name} Festival Season
          </div>
          <h1 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-[60px] tracking-wide text-[#2C2C2C] leading-normal py-1">
            Seasonal Festivals & Spots
          </h1>
          <p className="text-[#5C6460] text-sm sm:text-base mt-5 sm:mt-6 max-w-2xl font-light leading-relaxed">
            {season.tagline}. Experiences and celebrations curated for this time of year, scored by our location-aware recommendation engine.
          </p>

          {/* Seasonal Festivals Ribbon */}
          {season.festivals && season.festivals.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#D4CFC0]/60">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#7C8581] block mb-3">
                Featured Seasonal Festivals & Gatherings
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {season.festivals.map((fest) => (
                  <div
                    key={fest.id}
                    className="p-4 rounded-xl bg-white/70 border border-[#D4CFC0] backdrop-blur-xs flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-base text-[#2C2C2C]">{fest.name}</h3>
                      <p className="text-xs text-[#5C6460] mt-1 leading-relaxed">{fest.tagline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Season Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {SEASONS.map((s) => (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                  s.id === season.id
                    ? 'bg-[#347F8C] text-white font-bold shadow-md'
                    : 'bg-white/80 text-[#5C6460] border border-[#D4CFC0]'
                }`}
              >
                {s.icon} {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {experiences.length === 0 ? (
          /* Empty State */
          <div className="text-center py-24">
            <div className="text-5xl mb-6">{season.icon}</div>
            <h2 className="font-cormorant text-2xl text-[#2C2C2C] mb-3">Seasonal experiences coming soon</h2>
            <p className="text-[#5C6460] text-sm font-light max-w-md mx-auto">
              We&apos;re curating the best {season.name.toLowerCase()} spots for you. Check back soon.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-8 text-xs font-mono uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] font-bold px-5 py-2.5 rounded-lg transition-all shadow-md"
            >
              Browse All Experiences
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {experiences.map((exp) => {
              const imgSrc = resolveExperienceImageUrl(exp.mediaUrls?.[0]);

              return (
                <Link key={exp.id} href={`/experiences/${exp.id}`} className="group">
                  <article className="relative bg-white rounded-2xl overflow-hidden flex flex-col h-full border border-[#D4CFC0] hover:border-[#347F8C]/60 hover:shadow-lg transition-all duration-300 cursor-pointer">
                    {/* Image */}
                    <div className="relative h-56 w-full overflow-hidden bg-zinc-100">
                      <Image
                        src={imgSrc}
                        alt={exp.title}
                        fill
                        unoptimized
                        referrerPolicy="no-referrer"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider text-[#2C2C2C] font-bold border border-[#D4CFC0] uppercase shadow-sm">
                          {exp.city}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm font-bold">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{Number(exp.ratingAverage || 4.9).toFixed(2)}</span>
                      </div>

                      {/* Bottom Meta */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white">
                        <span className="text-[10px] font-mono text-zinc-200 flex items-center gap-1 font-medium truncate max-w-[65%]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#8B7355] shrink-0" />
                          <span className="truncate">{exp.provider?.businessName ? `Listed by ${exp.provider.businessName}` : 'Presented by a local connoisseur'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-200 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-zinc-300" />
                          {exp.durationMinutes || 120}m
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#347F8C] mb-1.5 block font-bold">
                          {exp.category}
                        </span>
                        <h3 className="font-cormorant font-bold text-xl sm:text-2xl tracking-normal text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-snug line-clamp-2">
                          {exp.title}
                        </h3>
                        <p className="text-[#5C6460] text-xs sm:text-sm line-clamp-2 mt-2 leading-relaxed font-light">
                          {exp.description || 'Authentic regional immersion hosted by generational craft and heritage lineage keepers.'}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#D4CFC0] flex items-center justify-between">
                        {(() => {
                          const p = formatPrice(exp.priceMin, exp.priceMax);
                          return (
                            <div>
                              <span className="text-[9px] font-mono uppercase tracking-widest text-[#7C8581] block">
                                {p.label}
                              </span>
                              <p className="font-bold font-cormorant oldstyle-nums text-[#2C2C2C] text-base tracking-wide">
                                {p.value}
                              </p>
                            </div>
                          );
                        })()}
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] group-hover:bg-[#2A6772] font-bold px-3.5 py-1.5 rounded-lg transition-all duration-300 shadow-md shadow-[#347F8C]/20">
                          Explore &rarr;
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
