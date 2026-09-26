'use client';

import { Suspense, useState, useEffect, useMemo, useTransition, useRef, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, MapPin, Star, ArrowRight, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { resolveExperienceImageUrl, FALLBACK_EXPERIENCE_IMAGE } from '@/lib/image-utils';
import { useOperatingStatus } from '@/lib/operating-hours';

export interface CategoryOption {
  label: string;
  value: string;
}

export interface CityOption {
  label: string;
  value: string;
}

export interface CuratedExperience {
  id: string;
  title: string;
  category: string;
  categoryLabel?: string;
  city: string;
  durationMinutes?: number;
  priceMin?: number;
  priceMax?: number;
  ratingAverage?: number;
  reviewStars?: number;
  googleReviewStars?: number;
  authenticityRating?: number;
  cover?: string;
  mediaUrls?: string[];
  description?: string;
  openingTime?: string;
  closingTime?: string;
  operatingHours?: string;
  closedDays?: string;
  provider?: {
    businessName?: string;
    verificationStatus?: string;
  };
}

interface CuratedDirectoryProps {
  initialExperiences: CuratedExperience[];
  categories: CategoryOption[];
  cities: CityOption[];
  targetId?: string;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number; tag: string }> = {
  mumbai: { lat: 19.0760, lng: 72.8777, tag: 'Coastal Heritage & Art Deco' },
  thane: { lat: 19.2183, lng: 72.9781, tag: 'City of Lakes & Ancient Shrines' },
  'navi mumbai': { lat: 19.0330, lng: 73.0297, tag: 'Flamingo Sanctuaries & Creek Trails' },
  powai: { lat: 19.1197, lng: 72.9051, tag: 'Lakeside Promenades & High-Tech Cafes' },
  'kanjur marg': { lat: 19.1300, lng: 72.9300, tag: 'Local Food Trails & Shrines' },
  panvel: { lat: 18.9894, lng: 73.1175, tag: 'Monsoon Waterfalls & Heritage Forts' },
  'kalyan-dombivli': { lat: 19.2211, lng: 73.0919, tag: 'Ganesh Ghat Riverfronts & Malvani Food' },
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ExperienceCard = memo(function ExperienceCard({
  exp,
  compact = false,
  isHovered = false,
  isFaded = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  exp: CuratedExperience;
  compact?: boolean;
  isHovered?: boolean;
  isFaded?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const rawTarget = exp.cover || exp.mediaUrls?.[0];
  const initialUrl = resolveExperienceImageUrl(rawTarget);
  const [imgSrc, setImgSrc] = useState(initialUrl);

  useEffect(() => {
    setImgSrc(resolveExperienceImageUrl(exp.cover || exp.mediaUrls?.[0]));
  }, [exp.cover, exp.mediaUrls]);

  const isFreePublic = (!exp.priceMin && !exp.priceMax) || (exp.priceMin === 0 && exp.priceMax === 0);
  const formattedPrice = isFreePublic
    ? 'Free Public Spot'
    : exp.priceMin === 0
    ? `Free Entry (Items extra)`
    : exp.priceMin === exp.priceMax
    ? `₹${exp.priceMin?.toLocaleString()}`
    : `₹${exp.priceMin?.toLocaleString()} – ₹${exp.priceMax?.toLocaleString()}`;

  // Legit rating priority: reviewStars -> googleReviewStars -> ratingAverage -> 4.8
  const ratingValue = Number(
    exp.reviewStars ?? exp.googleReviewStars ?? exp.ratingAverage ?? 4.8
  ).toFixed(2);

  // Live client-side detected timing and operating status
  const { isOpen } = useOperatingStatus({
    openingTime: exp.openingTime,
    closingTime: exp.closingTime,
    operatingHours: exp.operatingHours,
    closedDays: exp.closedDays,
  });

  return (
    <Link
      href={`/experiences/${exp.id}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative bg-white rounded-2xl overflow-hidden flex flex-col justify-between h-full transform-gpu transition-all duration-300 ease-out cursor-pointer block text-inherit no-underline ${
        isHovered
          ? 'scale-[1.04] -translate-y-2 z-30 shadow-2xl border-2 border-[#347F8C] ring-4 ring-[#347F8C]/25 brightness-105'
          : isFaded
          ? 'scale-[0.96] opacity-50 blur-[1.5px] brightness-90 border border-[#D4CFC0]'
          : 'scale-100 opacity-100 blur-0 border border-[#D4CFC0] hover:border-[#347F8C]/60 hover:shadow-lg'
      }`}
    >
      {/* Image Cover */}
      <div className={`relative ${compact ? 'h-48' : 'h-60'} w-full overflow-hidden bg-zinc-100`}>
        <Image
          src={imgSrc}
          alt={exp.title}
          fill
          unoptimized
          referrerPolicy="no-referrer"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={() => {
            if (imgSrc !== FALLBACK_EXPERIENCE_IMAGE) {
              setImgSrc(FALLBACK_EXPERIENCE_IMAGE);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm font-bold">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{ratingValue}</span>
          </div>
        </div>
      </div>

      {/* Card Details */}
      <div className={`${compact ? 'p-4' : 'p-6'} flex-1 flex flex-col justify-between`}>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#347F8C] mb-1.5 block font-bold">
            {exp.category}
          </span>
          <h3 className={`font-cormorant font-bold normal-case ${compact ? 'text-lg sm:text-xl line-clamp-2' : 'text-xl sm:text-2xl line-clamp-2'} tracking-normal text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-snug`}>
            {exp.title}
          </h3>
          <p className={`text-[#3D4441] ${compact ? 'text-xs line-clamp-2 mt-2' : 'text-xs sm:text-sm line-clamp-3 mt-3'} leading-relaxed font-light`}>
            {exp.description || 'Authentic regional immersion hosted by generational craft and heritage lineage keepers.'}
          </p>
        </div>

        <div className={`${compact ? 'mt-4 pt-3' : 'mt-8 pt-5'} border-t border-[#D4CFC0] flex items-center justify-between`}>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#555E5A] block">
              {isFreePublic ? 'Admission' : 'Est. Spend'}
            </span>
            <p className="font-bold font-cormorant oldstyle-nums text-[#2C2C2C] text-base sm:text-lg tracking-wide">
              {formattedPrice}
            </p>
          </div>

          {/* Bottom Right Corner: Live Open / Closed Tag */}
          <div className="text-right flex flex-col items-end justify-center">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#555E5A] block mb-0.5">
              Status
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider transition-all duration-300 border ${
                isOpen
                  ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-700 shadow-[0_1px_4px_rgba(16,185,129,0.12)]'
                  : 'bg-rose-50/90 border-rose-300/80 text-rose-700 shadow-[0_1px_4px_rgba(244,63,94,0.12)]'
              }`}
              title={
                exp.operatingHours ||
                (exp.openingTime && exp.closingTime
                  ? `${exp.openingTime} - ${exp.closingTime}`
                  : undefined)
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOpen
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span>{isOpen ? 'Open' : 'Closed'}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});

function CityExpeditionSection({
  cityName,
  tag,
  distanceKm,
  isNearest,
  experiences,
}: {
  cityName: string;
  tag: string;
  distanceKm: number;
  isNearest: boolean;
  experiences: CuratedExperience[];
}) {
  const cityKey = cityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const storageKey = `journi_expanded_city_${cityKey}`;
  const scrollKey = `journi_scroll_city_${cityKey}`;
  const limitKey = `journi_limit_city_${cityKey}`;

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initialize expanded state from sessionStorage so navigating back restores the window
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(storageKey) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const [visibleLimit, setVisibleLimit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(limitKey);
        if (saved) return Math.max(8, parseInt(saved, 10));
      } catch {}
    }
    return 8;
  });

  const topThree = experiences.slice(0, 3);
  const remainingExperiences = experiences.slice(3);
  const visibleRemaining = remainingExperiences.slice(0, visibleLimit);
  const hasMore = visibleLimit < remainingExperiences.length;

  // Toggle expansion & persist in sessionStorage
  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        if (next) {
          sessionStorage.setItem(storageKey, 'true');
        } else {
          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(scrollKey);
          sessionStorage.removeItem(limitKey);
        }
      } catch {}
      return next;
    });
  };

  // Restore horizontal scroll position when expanded
  useEffect(() => {
    if (!isExpanded || !scrollRef.current) return;
    try {
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll) {
        const left = parseInt(savedScroll, 10);
        if (!isNaN(left) && left > 0) {
          const timer = setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollLeft = left;
            }
          }, 80);
          return () => clearTimeout(timer);
        }
      }
    } catch {}
  }, [isExpanded, scrollKey, visibleLimit]);

  // Save horizontal scroll position on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isExpanded) return;

    let timeout: any;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          sessionStorage.setItem(scrollKey, String(el.scrollLeft));
        } catch {}
      }, 100);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [isExpanded, scrollKey]);

  // Save state when clicking an experience card
  const handleCardClick = () => {
    try {
      sessionStorage.setItem('journi_last_active_city', cityKey);
      sessionStorage.setItem('journi_page_scroll_y', String(window.scrollY));
      if (scrollRef.current && isExpanded) {
        sessionStorage.setItem(scrollKey, String(scrollRef.current.scrollLeft));
      }
    } catch {}
  };

  // Infinite Scroll: automatically load next batch of cards when scrolling near the end
  useEffect(() => {
    if (!isExpanded || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => {
            const next = Math.min(prev + 8, remainingExperiences.length);
            try {
              sessionStorage.setItem(limitKey, String(next));
            } catch {}
            return next;
          });
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '0px 350px 0px 0px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isExpanded, hasMore, remainingExperiences.length, limitKey]);

  // Wheel listener: map vertical wheel to sideways horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isExpanded) return;

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
  }, [isExpanded]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      if (direction === 'right' && hasMore) {
        setVisibleLimit((prev) => {
          const next = Math.min(prev + 8, remainingExperiences.length);
          try {
            sessionStorage.setItem(limitKey, String(next));
          } catch {}
          return next;
        });
      }
      const scrollAmount = direction === 'left' ? -420 : 420;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-20 last:mb-0" id={`city-${cityKey}`}>
      {/* ─── City Subheading & Distance Indicator ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#C4A265] pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#347F8C] font-mono text-[11px] tracking-[0.25em] uppercase font-bold">
              Heritage Quarter
            </span>
            {isNearest && (
              <span className="bg-[#347F8C] text-[#F5F1E6] font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs animate-pulse">
                <MapPin className="w-2.5 h-2.5" />
                Near You {distanceKm !== Infinity ? `(~${Math.round(distanceKm)} km)` : ''}
              </span>
            )}
            {!isNearest && distanceKm !== Infinity && distanceKm < 2000 && (
              <span className="bg-[#EAE5D6] text-[#5C6460] font-mono text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-[#347F8C]" />
                ~{Math.round(distanceKm)} km away
              </span>
            )}
          </div>
          <h3 className="flex items-baseline gap-3 my-1 sm:my-1.5 scroll-fade-ready">
            <span className="font-edu-cursive font-normal text-3xl sm:text-4xl lg:text-[42px] text-[#2C2C2C] tracking-wide leading-normal">
              {cityName}
            </span>
            <span className="text-base font-cormorant font-semibold oldstyle-nums text-[#5C6460] tracking-normal">
              (<AnimatedCounter target={experiences.length} /> Experiences)
            </span>
          </h3>
        </div>
      </div>

      {/* ─── Top 3 Curated Experiences Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {topThree.map((exp) => (
          <ExperienceCard key={exp.id} exp={exp} onClick={handleCardClick} />
        ))}
      </div>

      {/* ─── Explore All Button below 3 experiences ─── */}
      {remainingExperiences.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleToggleExpand}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#347F8C] bg-white hover:bg-[#347F8C] text-[#347F8C] hover:text-[#F5F1E6] font-mono text-xs uppercase tracking-wider font-bold transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
          >
            <span>{isExpanded ? `Collapse ${cityName} Experiences` : `Explore All ${cityName} (${experiences.length})`}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* ─── Sideways Scroll 3D Animation for all other experiences in the city ─── */}
      {isExpanded && remainingExperiences.length > 0 && (
        <div className="bg-[#EFEAE0]/80 border border-[#D4CFC0] rounded-3xl p-6 shadow-inner mb-8 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#2C2C2C] font-bold">
                All {cityName} Experiences ({experiences.length})
              </span>
            </div>

            {/* Scroll Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="w-9 h-9 rounded-full bg-white border border-[#D4CFC0] hover:bg-[#347F8C] hover:text-white hover:border-[#347F8C] flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
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

          {/* Sideways Scroll Row - 4 cards visible across viewport */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pt-7 pb-10 px-6 scroll-pl-6 scroll-pr-6 snap-x scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none' }}
          >
            {visibleRemaining.map((exp) => (
              <div
                key={exp.id}
                className="w-[calc(25%-12px)] min-w-[270px] max-w-[320px] shrink-0 snap-start p-2.5"
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '280px 380px',
                }}
              >
                <ExperienceCard
                  exp={exp}
                  compact
                  isHovered={hoveredCardId === exp.id}
                  isFaded={hoveredCardId !== null && hoveredCardId !== exp.id}
                  onClick={handleCardClick}
                  onMouseEnter={() => setHoveredCardId(exp.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                />
              </div>
            ))}

            {/* Seamless Infinite Scroll Sentinel */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="w-16 shrink-0 flex items-center justify-center p-4 snap-start text-[#347F8C]"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#347F8C] border-t-transparent animate-spin opacity-60" />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CuratedDirectoryContent({
  initialExperiences,
  categories,
  cities,
  targetId = 'curated-experiences',
}: CuratedDirectoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const currentCat = searchParams?.get('cat') || '';
  const currentCity = searchParams?.get('city') || '';
  const currentQ = searchParams?.get('q') || '';

  const [activeCategory, setActiveCategory] = useState(currentCat);
  const [selectedCity, setSelectedCity] = useState(currentCity);
  const [searchQuery, setSearchQuery] = useState(currentQ);

  // Request browser geolocation on mount to sort nearest city first
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Restore the previous city only for browser back/forward navigation.
  // A reload must start at the hero rather than reviving stale session state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navigation?.type !== 'back_forward') return;

      const lastActiveCity = sessionStorage.getItem('journi_last_active_city');
      const savedPageScroll = sessionStorage.getItem('journi_page_scroll_y');

      if (lastActiveCity || savedPageScroll) {
        const restoreScroll = () => {
          if (lastActiveCity) {
            const cityEl = document.getElementById(`city-${lastActiveCity}`);
            if (cityEl) {
              cityEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              return;
            }
          }
          if (savedPageScroll) {
            const y = parseInt(savedPageScroll, 10);
            if (!isNaN(y) && y > 0) {
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }
        };

        const t1 = setTimeout(restoreScroll, 120);
        const t2 = setTimeout(restoreScroll, 400);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    } catch {}
  }, []);

  useEffect(() => {
    setActiveCategory(currentCat);
  }, [currentCat]);

  useEffect(() => {
    setSelectedCity(currentCity);
  }, [currentCity]);

  useEffect(() => {
    setSearchQuery(currentQ);
  }, [currentQ]);

  const updateUrl = (cat: string, city: string, q: string) => {
    const params = new URLSearchParams();
    if (cat) params.set('cat', cat);
    if (city) params.set('city', city);
    if (q.trim()) params.set('q', q.trim());

    const qs = params.toString();
    const newUrl = `${pathname || '/'}${qs ? `?${qs}` : ''}`;

    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  };

  const handleCategoryClick = (catVal: string) => {
    setActiveCategory(catVal);
    updateUrl(catVal, selectedCity, searchQuery);
  };

  const handleCityChange = (cityVal: string) => {
    setSelectedCity(cityVal);
    updateUrl(activeCategory, cityVal, searchQuery);
  };

  const handleSearchChange = (qVal: string) => {
    setSearchQuery(qVal);
    updateUrl(activeCategory, selectedCity, qVal);
  };

  const handleReset = () => {
    setActiveCategory('');
    setSelectedCity('');
    setSearchQuery('');
    updateUrl('', '', '');
  };

  // 1. Filtered list based on search and category
  const filteredExperiences = useMemo(() => {
    const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

    return initialExperiences.filter((exp) => {
      // 0. Strictly exclude seasonal experiences (only shown when clicking the seasonal banner)
      if (
        (exp as any).isSeasonal ||
        (exp as any).metadata?.isSeasonal ||
        exp.id?.startsWith('seasonal-') ||
        exp.category === 'Diwali' ||
        exp.category === 'Ganesh Chaturthi' ||
        exp.category === 'Navaratri' ||
        (exp as any).metadata?.festival ||
        (exp as any).metadata?.seasonalCategory ||
        (Array.isArray((exp as any).tags) && (exp as any).tags.includes('seasonal'))
      ) {
        return false;
      }

      // 1. Strictly exclude removed cities (Jaipur & Ahmedabad)
      if (exp.city && EXCLUDED_CITIES.has(exp.city.toLowerCase())) {
        return false;
      }

      // 2. Category filter
      if (activeCategory && exp.category?.toLowerCase() !== activeCategory.toLowerCase()) {
        return false;
      }

      // 3. City filter
      if (selectedCity && exp.city?.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = exp.title?.toLowerCase().includes(q);
        const matchesDesc = exp.description?.toLowerCase().includes(q);
        const matchesCity = exp.city?.toLowerCase().includes(q);
        const matchesCat = exp.category?.toLowerCase().includes(q);
        const matchesProvider = exp.provider?.businessName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCity && !matchesCat && !matchesProvider) {
          return false;
        }
      }
      return true;
    });
  }, [initialExperiences, activeCategory, selectedCity, searchQuery]);

  // 2. Group experiences by City and sort nearest to user
  const groupedCitySections = useMemo(() => {
    const groups: Record<string, CuratedExperience[]> = {};
    filteredExperiences.forEach((exp) => {
      const c = exp.city || 'Other';
      if (!groups[c]) groups[c] = [];
      groups[c].push(exp);
    });

    const cityNames = Object.keys(groups);

    return cityNames
      .map((cityName) => {
        const normKey = cityName.toLowerCase();
        const coords = CITY_COORDINATES[normKey];
        let distanceKm = Infinity;
        if (coords && userCoords) {
          distanceKm = haversineKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng);
        }
        return {
          cityName,
          tag: coords?.tag || 'Curated Regional Enclave',
          distanceKm,
          experiences: groups[cityName],
        };
      })
      .sort((a, b) => {
        // Nearest city first if coordinates available
        if (userCoords && a.distanceKm !== Infinity && b.distanceKm !== Infinity) {
          return a.distanceKm - b.distanceKm;
        }
        // Default ranking for Maharashtra
        const order = ['mumbai', 'thane', 'navi mumbai', 'powai', 'kanjur marg', 'panvel', 'kalyan-dombivli'];
        const aIdx = order.indexOf(a.cityName.toLowerCase());
        const bIdx = order.indexOf(b.cityName.toLowerCase());
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.cityName.localeCompare(b.cityName);
      });
  }, [filteredExperiences, userCoords]);

  return (
    <div id={targetId}>
      {/* ─── Filter Controls Bar ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="mt-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Typographic Category Chips */}
            <div className="flex items-center gap-2 flex-wrap py-1 flex-1 min-w-0">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryClick(cat.value)}
                    className={`cursor-pointer px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all duration-200 border shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-[#347F8C] text-[#F5F1E6] border-[#347F8C] font-bold shadow-md shadow-[#347F8C]/20'
                        : 'bg-white/90 text-[#2C2C2C] border-[#D4CFC0] hover:border-[#347F8C]/50 hover:bg-white shadow-sm'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search & City Filter Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUrl(activeCategory, selectedCity, searchQuery);
              }}
              className="flex items-center gap-2 bg-white/95 border border-[#D4CFC0] p-1.5 rounded-2xl focus-within:border-[#347F8C] transition-colors shadow-sm shrink-0"
            >
              <div className="flex items-center gap-2 px-3 text-[#5C6460]">
                <Search className={`w-3.5 h-3.5 text-[#5C6460] ${isPending ? 'animate-spin' : ''}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search master or craft..."
                  aria-label="Search master or craft"
                  className="bg-transparent text-xs text-[#2C2C2C] placeholder-[#7C8581] focus:outline-none w-36 sm:w-44 font-light"
                />
              </div>

              <div className="h-5 w-px bg-[#D4CFC0]" />

              <div className="flex items-center gap-1 px-2 text-xs text-[#2C2C2C]">
                <MapPin className="w-3 h-3 text-[#347F8C]" />
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  aria-label="Filter experiences by city"
                  className="bg-transparent text-xs text-[#2C2C2C] focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-[#2C2C2C]"
                >
                  {cities.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="cursor-pointer bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-md shadow-[#347F8C]/20"
              >
                Filter
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ─── City Sections with Top 3 + Sideways Scrolling Experiences ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {groupedCitySections.length === 0 ? (
          <div className="text-center py-28 bg-white border border-[#D4CFC0] rounded-3xl shadow-sm">
            <h3 className="font-manifold text-xl tracking-wider text-[#2C2C2C] uppercase">
              No matching expeditions
            </h3>
            <p className="text-[#5C6460] text-xs sm:text-sm max-w-sm mx-auto mt-2 font-light">
              We couldn&apos;t find any journeys matching your criteria. Try adjusting your city or keyword.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#347F8C] border border-[#347F8C]/40 hover:bg-[#347F8C] hover:text-[#F5F1E6] px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            {groupedCitySections.map((cityGroup, idx) => (
              <CityExpeditionSection
                key={cityGroup.cityName}
                cityName={cityGroup.cityName}
                tag={cityGroup.tag}
                distanceKm={cityGroup.distanceKm}
                isNearest={idx === 0}
                experiences={cityGroup.experiences}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CuratedDirectory(props: CuratedDirectoryProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#5C6460] font-mono text-xs uppercase tracking-wider">
          Loading curated expeditions...
        </div>
      }
    >
      <CuratedDirectoryContent {...props} />
    </Suspense>
  );
}
