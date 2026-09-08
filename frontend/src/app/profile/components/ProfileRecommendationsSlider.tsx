'use client';

import { useState, useEffect, useMemo, useRef, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star, Clock, ShieldCheck, Sparkles, SlidersHorizontal } from 'lucide-react';
import { BookmarkButton } from '@/components/BookmarkButton';
import catalogDataset from '@/lib/catalog-dataset.json';

export interface TravelerPreferencesSummary {
  homeCity?: string | null;
  interests?: string[];
  budgetBand?: string | null;
  travelStyle?: string | null;
}

interface RawExperience {
  id: string;
  title: string;
  category: string;
  city: string;
  area?: string;
  description?: string;
  priceMin?: number;
  priceMax?: number;
  budgetBand?: string;
  durationMinutes?: number;
  ratingAverage?: number;
  authenticityRating?: number;
  mediaUrls?: string[];
  tags?: string[];
  vibe?: string;
  bestFor?: string[];
  provider?: {
    businessName?: string;
    verificationStatus?: string;
  };
}

interface ScoredExperience extends RawExperience {
  matchScore: number; // 0 - 100
  matchReason: string;
  matchHighlights: string[];
}

interface ProfileRecommendationsSliderProps {
  preferences?: TravelerPreferencesSummary | null;
  userName?: string;
  onOpenPreferences?: () => void;
}

const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

/**
 * Score an experience based on the traveler's profile preferences
 */
function scoreExperience(exp: RawExperience, prefs: TravelerPreferencesSummary | null | undefined): ScoredExperience {
  let score = 50; // base score
  const highlights: string[] = [];

  const homeCity = prefs?.homeCity?.trim().toLowerCase();
  const interests = (prefs?.interests || []).map((i) => i.trim().toUpperCase());
  const budgetBand = prefs?.budgetBand?.trim().toUpperCase();
  const travelStyle = prefs?.travelStyle?.trim().toUpperCase();

  const expCity = (exp.city || '').toLowerCase();
  const expCategory = (exp.category || '').toUpperCase();
  const expTags = (exp.tags || []).map((t) => t.toLowerCase());
  const expDesc = (exp.description || '').toLowerCase();
  const expVibe = (exp.vibe || '').toLowerCase();

  // 1. Location / Home City Match
  if (homeCity) {
    if (expCity === homeCity) {
      score += 28;
      highlights.push(`In ${exp.city}`);
    } else if (
      (homeCity.includes('mumbai') && ['thane', 'navi mumbai', 'powai', 'panvel', 'kanjur marg'].includes(expCity)) ||
      (homeCity.includes('thane') && ['mumbai', 'powai', 'kalyan-dombivli'].includes(expCity))
    ) {
      score += 15;
      highlights.push(`Near ${prefs?.homeCity}`);
    }
  }

  // 2. Interests & Vibes Match
  if (interests.length > 0) {
    let interestMatched = false;

    // Check direct category match
    if (interests.includes(expCategory)) {
      score += 25;
      highlights.push(exp.category.replace(/_/g, ' '));
      interestMatched = true;
    }

    // Secondary semantic checks (tags/desc/vibe)
    for (const interest of interests) {
      const kw = interest.toLowerCase().replace(/_/g, ' ');
      const matchesTag = expTags.some((t) => t.includes(kw) || kw.includes(t));
      const matchesVibe = expVibe.includes(kw);
      const matchesDesc = expDesc.includes(kw);

      if (matchesTag || matchesVibe || matchesDesc) {
        score += 8;
        if (!interestMatched) {
          highlights.push(interest.replace(/_/g, ' '));
          interestMatched = true;
        }
        break;
      }
    }
  }

  // 3. Budget Tier Fit
  if (budgetBand) {
    if (exp.budgetBand?.toUpperCase() === budgetBand) {
      score += 16;
      highlights.push(`${budgetBand.toLowerCase()} tier`);
    } else {
      // Estimate based on priceMin
      const p = exp.priceMin ?? 0;
      if (budgetBand === 'BUDGET' && p <= 500) {
        score += 12;
      } else if (budgetBand === 'MODERATE' && p >= 300 && p <= 1500) {
        score += 12;
      } else if (budgetBand === 'PREMIUM' && p >= 1000 && p <= 3500) {
        score += 14;
        highlights.push('Premium fit');
      } else if (budgetBand === 'LUXURY' && p >= 2500) {
        score += 14;
        highlights.push('Luxury fit');
      }
    }
  }

  // 4. Travel Style Fit
  if (travelStyle) {
    if (travelStyle === 'OFF_BEAT') {
      if (expCategory === 'HIDDEN_GEMS' || (exp.authenticityRating && exp.authenticityRating >= 0.85)) {
        score += 16;
        highlights.push('Off the beaten path');
      }
    } else if (travelStyle === 'CULTURAL_DEEP_DIVE') {
      if (expCategory === 'CULTURE' || expCategory === 'WORKSHOPS') {
        score += 16;
        highlights.push('Cultural immersion');
      }
    } else if (travelStyle === 'FAST_PACED') {
      if (exp.durationMinutes && exp.durationMinutes <= 60) {
        score += 14;
        highlights.push('Quick pace');
      }
    } else if (travelStyle === 'RELAXED') {
      if ((exp.durationMinutes && exp.durationMinutes >= 90) || expCategory === 'FOOD') {
        score += 14;
        highlights.push('Leisurely pace');
      }
    } else if (travelStyle === 'FAMILY_FRIENDLY') {
      if (exp.bestFor?.some((b) => b.toLowerCase().includes('famil'))) {
        score += 14;
        highlights.push('Family friendly');
      }
    }
  }

  // 5. Quality and Authenticity
  if (exp.ratingAverage && exp.ratingAverage >= 4.5) {
    score += Math.round((exp.ratingAverage - 4.0) * 10);
  }
  if (exp.authenticityRating && exp.authenticityRating >= 0.8) {
    score += Math.round(exp.authenticityRating * 8);
  }

  // Clamp normalized score between 70% and 99%
  const finalMatchScore = Math.min(99, Math.max(72, Math.round(score)));

  let matchReason = '';
  if (highlights.length > 0) {
    matchReason = `Matches your ${highlights.slice(0, 2).join(' & ')} preferences`;
  } else {
    matchReason = 'Curated top recommendation for travelers';
  }

  return {
    ...exp,
    matchScore: finalMatchScore,
    matchReason,
    matchHighlights: highlights,
  };
}

const RecommendationCard = memo(function RecommendationCard({
  exp,
  isHovered,
  isFaded,
  onMouseEnter,
  onMouseLeave,
}: {
  exp: ScoredExperience;
  isHovered: boolean;
  isFaded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const fallbackUrl = 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=80';
  const initialUrl = (exp.mediaUrls?.[0] || fallbackUrl).replace('thumb.wikimedia.org', 'upload.wikimedia.org');
  const [imgSrc, setImgSrc] = useState(initialUrl);

  useEffect(() => {
    const nextUrl = (exp.mediaUrls?.[0] || fallbackUrl).replace('thumb.wikimedia.org', 'upload.wikimedia.org');
    setImgSrc(nextUrl);
  }, [exp.mediaUrls]);

  const formattedPrice =
    (!exp.priceMin && !exp.priceMax) || (exp.priceMin === 0 && exp.priceMax === 0)
      ? 'Free'
      : exp.priceMin === 0
      ? `Free – ₹${exp.priceMax?.toLocaleString()}`
      : `₹${exp.priceMin?.toLocaleString()} – ₹${exp.priceMax?.toLocaleString()}`;

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative bg-white rounded-2xl overflow-hidden flex flex-col justify-between h-full transform-gpu transition-all duration-300 ease-out cursor-pointer ${
        isHovered
          ? 'scale-[1.04] -translate-y-2 z-30 shadow-2xl border-2 border-[#347F8C] ring-4 ring-[#347F8C]/25 brightness-105'
          : isFaded
          ? 'scale-[0.96] opacity-50 blur-[1.5px] brightness-90 border border-[#D4CFC0]'
          : 'scale-100 opacity-100 blur-0 border border-[#D4CFC0] hover:border-[#347F8C]/60 hover:shadow-lg'
      }`}
    >
      {/* Image Cover */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-100">
        <Image
          src={imgSrc}
          alt={exp.title}
          fill
          unoptimized
          referrerPolicy="no-referrer"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          onError={() => {
            if (imgSrc !== fallbackUrl) {
              setImgSrc(fallbackUrl);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80" />

        {/* Top Badges: City + Match Score Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider text-[#2C2C2C] font-bold border border-[#D4CFC0] uppercase shadow-sm">
            {exp.city}
          </span>
          <span className="bg-[#347F8C] text-[#F5F1E6] backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-bold shadow-xs">
            {exp.matchScore}% Match
          </span>
        </div>

        {/* Top Right: Bookmark + Star Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
          <BookmarkButton experience={exp} size="sm" />
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm font-bold">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{Number(exp.ratingAverage || 4.8).toFixed(2)}</span>
          </div>
        </div>

        {/* Host Info & Duration */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white">
          <span className="text-[10px] font-mono text-zinc-200 flex items-center gap-1 font-medium truncate max-w-[65%]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8B7355] shrink-0" />
            <span className="truncate">
              {exp.provider?.businessName ? `Listed by ${exp.provider.businessName}` : 'Listed by Local Expert'}
            </span>
          </span>
          <span className="text-[10px] font-mono text-zinc-200 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-zinc-300" />
            {exp.durationMinutes || 60}m
          </span>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#347F8C] block font-bold">
              {exp.category}
            </span>
            {exp.matchHighlights.length > 0 && (
              <span className="text-[9px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded text-right truncate max-w-[130px]">
                {exp.matchHighlights[0]}
              </span>
            )}
          </div>

          <h3 className="font-cormorant font-bold normal-case text-lg sm:text-xl line-clamp-2 tracking-normal text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-snug">
            {exp.title}
          </h3>

          <p className="text-[#5C6460] text-xs line-clamp-2 mt-2 leading-relaxed font-light">
            {exp.description || 'Authentic regional immersion hosted by verified local guides and heritage custodians.'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#D4CFC0] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#7C8581] block">
              Starting at
            </span>
            <p className="font-bold font-cormorant oldstyle-nums text-[#2C2C2C] text-base sm:text-lg tracking-wide">
              {formattedPrice}
            </p>
          </div>
          <Link
            href={`/experiences/${exp.id}`}
            className="group/btn inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] font-bold px-3.5 py-1.5 rounded-lg transition-all duration-300 active:scale-95 shadow-md shadow-[#347F8C]/20"
          >
            <span>Explore</span>
            <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
});

export function ProfileRecommendationsSlider({
  preferences,
  userName = 'Traveler',
  onOpenPreferences,
}: ProfileRecommendationsSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [allExperiences, setAllExperiences] = useState<RawExperience[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CITY' | string>('ALL');
  const [loading, setLoading] = useState(true);

  // Load catalog dataset
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetch('/api/experiences?limit=500');
        if (res.ok) {
          const json = await res.json();
          if (json?.data && Array.isArray(json.data) && json.data.length > 0 && isMounted) {
            setAllExperiences(json.data.filter((e: any) => !EXCLUDED_CITIES.has(e.city?.toLowerCase())));
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local dataset
      }

      if (isMounted) {
        const localData = (catalogDataset as any[]).filter(
          (e) => !EXCLUDED_CITIES.has(e.city?.toLowerCase())
        );
        setAllExperiences(localData);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute scored recommendations based on profile preferences
  const scoredRecommendations = useMemo(() => {
    if (!allExperiences.length) return [];
    return allExperiences
      .map((exp) => scoreExperience(exp, preferences))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [allExperiences, preferences]);

  // Available filter options based on the user's active preferences
  const filterOptions = useMemo(() => {
    const opts: { key: string; label: string; count: number }[] = [
      { key: 'ALL', label: 'All Top Matches', count: scoredRecommendations.length },
    ];

    if (preferences?.homeCity) {
      const cityCount = scoredRecommendations.filter(
        (e) => e.city.toLowerCase() === preferences.homeCity?.toLowerCase()
      ).length;
      if (cityCount > 0) {
        opts.push({
          key: 'CITY',
          label: `In ${preferences.homeCity}`,
          count: cityCount,
        });
      }
    }

    if (preferences?.interests && preferences.interests.length > 0) {
      preferences.interests.forEach((interest) => {
        const catCount = scoredRecommendations.filter(
          (e) => e.category.toUpperCase() === interest.toUpperCase()
        ).length;
        if (catCount > 0) {
          opts.push({
            key: `CAT_${interest}`,
            label: interest.replace(/_/g, ' '),
            count: catCount,
          });
        }
      });
    }

    return opts;
  }, [scoredRecommendations, preferences]);

  // Filtered recommendations for the slider
  const displayedRecommendations = useMemo(() => {
    if (activeFilter === 'ALL') {
      return scoredRecommendations.slice(0, 36);
    }
    if (activeFilter === 'CITY' && preferences?.homeCity) {
      return scoredRecommendations
        .filter((e) => e.city.toLowerCase() === preferences.homeCity?.toLowerCase())
        .slice(0, 36);
    }
    if (activeFilter.startsWith('CAT_')) {
      const cat = activeFilter.replace('CAT_', '');
      return scoredRecommendations
        .filter((e) => e.category.toUpperCase() === cat.toUpperCase())
        .slice(0, 36);
    }
    return scoredRecommendations.slice(0, 36);
  }, [scoredRecommendations, activeFilter, preferences]);

  // Horizontal wheel scroll handler
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 1.5,
          behavior: 'smooth',
        });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const hasPreferences =
    Boolean(preferences?.homeCity) ||
    (preferences?.interests && preferences.interests.length > 0) ||
    Boolean(preferences?.budgetBand) ||
    Boolean(preferences?.travelStyle);

  const headlineTitle = preferences?.homeCity
    ? `ALL ${preferences.homeCity.toUpperCase()} & CURATED EXPERIENCES (${displayedRecommendations.length})`
    : `RECOMMENDED EXPERIENCES FOR ${userName.toUpperCase()} (${displayedRecommendations.length})`;

  return (
    <section className="space-y-4">
      {/* Container matching screenshot 2: Warm Sand Tint, Border, Rounded-3xl, Inner Shadow */}
      <div className="bg-[#EFEAE0]/80 border border-[#D4CFC0] rounded-3xl p-6 sm:p-7 shadow-inner transition-all duration-300">
        {/* Top Header Bar with Monospace Title & Navigation Arrows */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#2C2C2C] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {headlineTitle}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#5C6460]">
              {hasPreferences
                ? `Algorithmically ranked by your base (${preferences?.homeCity || 'Nearby'}), budget (${preferences?.budgetBand || 'standard'}), and vibe preferences.`
                : 'Showing top curated experiences. Customize your preferences anytime for tailored recommendations.'}
            </p>
          </div>

          {/* Right Action: Filter chips or Scroll Arrows */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onOpenPreferences && (
              <button
                type="button"
                onClick={onOpenPreferences}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-[#D4CFC0] hover:border-[#347F8C] text-[#2C2C2C] hover:text-[#347F8C] text-[11px] font-mono uppercase tracking-wider transition-all shadow-xs cursor-pointer mr-1 active:scale-95"
                title="Adjust your recommendation preferences"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden sm:inline">Preferences</span>
              </button>
            )}

            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full bg-white border border-[#D4CFC0] hover:bg-[#347F8C] hover:text-white hover:border-[#347F8C] flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full bg-white border border-[#D4CFC0] hover:bg-[#347F8C] hover:text-white hover:border-[#347F8C] flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Filter Pills for Profile Preferences */}
        {filterOptions.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(opt.key);
                    if (scrollRef.current) {
                      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#347F8C] text-[#F5F1E6] border-[#347F8C] font-bold shadow-xs'
                      : 'bg-white/80 text-[#2C2C2C] border-[#D4CFC0] hover:border-[#347F8C]/60 hover:bg-white'
                  }`}
                >
                  {opt.label} ({opt.count})
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal Slider Track */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden pt-7 pb-10 px-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[calc(25%-12px)] min-w-[270px] max-w-[320px] h-[360px] bg-white/70 border border-[#D4CFC0] rounded-2xl animate-pulse p-4 flex flex-col justify-between"
              >
                <div className="h-40 bg-zinc-200/70 rounded-xl" />
                <div className="space-y-2 mt-4">
                  <div className="h-4 bg-zinc-200/70 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200/50 rounded w-full" />
                </div>
                <div className="h-8 bg-zinc-200/50 rounded-lg mt-4" />
              </div>
            ))}
          </div>
        ) : displayedRecommendations.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-2xl border border-[#D4CFC0]">
            <p className="text-xs font-mono text-[#5C6460] uppercase tracking-wider">
              No recommendations found for this filter.
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className="mt-3 px-4 py-1.5 rounded-xl bg-[#347F8C] text-white text-xs font-mono font-bold"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pt-7 pb-10 px-6 scroll-pl-6 scroll-pr-6 snap-x scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none' }}
          >
            {displayedRecommendations.map((exp) => (
              <div
                key={exp.id}
                className="w-[calc(25%-12px)] min-w-[270px] max-w-[320px] shrink-0 snap-start p-2.5"
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '280px 380px',
                }}
              >
                <RecommendationCard
                  exp={exp}
                  isHovered={hoveredCardId === exp.id}
                  isFaded={hoveredCardId !== null && hoveredCardId !== exp.id}
                  onMouseEnter={() => setHoveredCardId(exp.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
