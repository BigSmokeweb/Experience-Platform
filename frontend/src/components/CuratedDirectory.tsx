'use client';

import { Suspense, useState, useEffect, useMemo, useTransition, useRef, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, MapPin, Clock, Star, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { BookmarkButton } from '@/components/BookmarkButton';

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
  authenticityRating?: number;
  mediaUrls?: string[];
  description?: string;
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
  onMouseEnter,
  onMouseLeave,
}: {
  exp: CuratedExperience;
  compact?: boolean;
  isHovered?: boolean;
  isFaded?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
      <div className={`relative ${compact ? 'h-48' : 'h-60'} w-full overflow-hidden bg-zinc-100`}>
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

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider text-[#2C2C2C] font-bold border border-[#D4CFC0] uppercase shadow-sm">
            {exp.city}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
          <BookmarkButton experience={exp} size="sm" />
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm font-bold">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{Number(exp.ratingAverage || 4.9).toFixed(2)}</span>
          </div>
        </div>

        {/* Host Guild Base Meta */}
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

      {/* Card Details */}
      <div className={`${compact ? 'p-4' : 'p-6'} flex-1 flex flex-col justify-between`}>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#347F8C] mb-1.5 block font-bold">
            {exp.category}
          </span>
          <h3 className={`font-cormorant font-bold normal-case ${compact ? 'text-lg sm:text-xl line-clamp-2' : 'text-xl sm:text-2xl line-clamp-2'} tracking-normal text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-snug`}>
            {exp.title}
          </h3>
          <p className={`text-[#5C6460] ${compact ? 'text-xs line-clamp-2 mt-2' : 'text-xs sm:text-sm line-clamp-3 mt-3'} leading-relaxed font-light`}>
            {exp.description || 'Authentic regional immersion hosted by generational craft and heritage lineage keepers.'}
          </p>
        </div>

        <div className={`${compact ? 'mt-4 pt-3' : 'mt-8 pt-5'} border-t border-[#D4CFC0] flex items-center justify-between`}>
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
            <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-1">&rarr;</span>
          </Link>
        </div>
      </div>
    </article>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(8);

  const topThree = experiences.slice(0, 3);
  const remainingExperiences = experiences.slice(3);
  const visibleRemaining = remainingExperiences.slice(0, visibleLimit);
  const hasMore = visibleLimit < remainingExperiences.length;

  // Reset visible batch count when experiences or expansion state changes
  useEffect(() => {
    setVisibleLimit(8);
  }, [experiences, isExpanded]);

  // Infinite Scroll: automatically load next batch of cards when scrolling near the end
  useEffect(() => {
    if (!isExpanded || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => Math.min(prev + 8, remainingExperiences.length));
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
  }, [isExpanded, hasMore, remainingExperiences.length]);

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
        setVisibleLimit((prev) => Math.min(prev + 8, remainingExperiences.length));
      }
      const scrollAmount = direction === 'left' ? -420 : 420;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-20 last:mb-0">
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
          <h3 className="flex items-baseline gap-3 my-1 sm:my-1.5">
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
          <ExperienceCard key={exp.id} exp={exp} />
        ))}
      </div>

      {/* ─── Explore All Button below 3 experiences ─── */}
      {remainingExperiences.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
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
              We couldn't find any journeys matching your criteria. Try adjusting your city or keyword.
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
