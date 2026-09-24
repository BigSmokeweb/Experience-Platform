'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, Clock, Camera, ChevronRight, Navigation } from 'lucide-react';
import { BookmarkButton } from '@/components/BookmarkButton';
import { resolveExperienceImageUrl } from '@/lib/image-utils';
import { REGIONAL_PRESETS, sortExperiencesByLocation } from '@/lib/geo-distance';

export interface SeasonalItem {
  id: string;
  title: string;
  venue?: string;
  eventArea?: string;
  category: string;
  categoryLabel?: string;
  city: string;
  state?: string;
  area?: string;
  cover: string;
  mediaUrls: string[];
  images?: string[];
  candidateLat?: number;
  candidateLng?: number;
  priceMin?: number;
  priceMax?: number;
  durationMinutes?: number;
  ratingAverage: number;
  reviewCount: number;
  authenticityRating?: number;
  description: string;
  humanTip?: string;
  bestTime?: string;
  vibe?: string;
  mustTry?: string;
  tags?: string[];
  provider?: {
    businessName?: string;
    verificationStatus?: string;
  };
}

interface SeasonalDirectoryProps {
  initialExperiences: SeasonalItem[];
}

const FESTIVAL_THEMES: Record<string, { badgeBg: string; badgeBorder: string; badgeText: string }> = {
  Diwali: {
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-700',
  },
  'Ganesh Chaturthi': {
    badgeBg: 'bg-orange-500/10',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-700',
  },
  Navaratri: {
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-700',
  },
};

export function SeasonalDirectory({ initialExperiences }: SeasonalDirectoryProps) {
  // Default reference coords: Thane (19.2183, 72.9781), automatically refined if user grants browser GPS
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(REGIONAL_PRESETS.thane);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Fallback remains Thane
          setUserCoords(REGIONAL_PRESETS.thane);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // STRICT location-based recommendation engine: sorted purely by distanceKm ascending (no other variables)
  const recommendedExperiences = useMemo(() => {
    return sortExperiencesByLocation(initialExperiences, userCoords.lat, userCoords.lng);
  }, [initialExperiences, userCoords]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
      {recommendedExperiences.map((item, idx) => {
        const imgSrc = resolveExperienceImageUrl(item.cover || item.mediaUrls?.[0]);
        const theme = FESTIVAL_THEMES[item.category] || FESTIVAL_THEMES['Ganesh Chaturthi'];
        const photoCount = item.mediaUrls?.length || 1;
        const formattedDistance =
          item.distanceKm < 1
            ? `${Math.round(item.distanceKm * 1000)} m`
            : `${item.distanceKm.toFixed(1)} km`;

        return (
          <article
            key={item.id}
            className="relative bg-white rounded-2xl overflow-hidden flex flex-col h-full border border-[#D4CFC0] hover:border-[#347F8C]/60 hover:shadow-xl hover:shadow-stone-900/5 transition-all duration-300"
          >
            {/* Image Container with Link */}
            <div className="relative h-60 w-full overflow-hidden bg-stone-100 group">
              <Link href={`/experiences/${item.id}`} className="block w-full h-full">
                <Image
                  src={imgSrc}
                  alt={item.title}
                  fill
                  unoptimized
                  priority={idx < 3}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </Link>

              {/* Top Left: Exact Distance Badge & City */}
              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none">
                <span className="bg-[#347F8C] text-white px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-bold shadow-md flex items-center gap-1">
                  <Navigation className="w-2.5 h-2.5" />
                  {formattedDistance} away
                </span>
                <span className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider text-[#2C2C2C] font-bold border border-[#D4CFC0] uppercase shadow-sm">
                  {item.city}
                </span>
              </div>

              {/* Top Right: Rating & Bookmark */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm font-bold">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{Number(item.ratingAverage || 4.9).toFixed(2)}</span>
                </div>
                <BookmarkButton
                  experience={{
                    id: item.id,
                    title: item.title,
                    city: item.city,
                    category: item.category,
                    mediaUrls: item.mediaUrls,
                    priceMin: 0,
                    priceMax: 0,
                    ratingAverage: item.ratingAverage,
                  }}
                  size="sm"
                />
              </div>

              {/* Bottom Metadata inside Image */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10 pointer-events-none">
                <span className="text-[10px] font-mono text-zinc-200 flex items-center gap-1 font-medium truncate max-w-[70%]">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{item.venue || item.eventArea}</span>
                </span>
                {photoCount > 1 && (
                  <span className="text-[10px] font-mono bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full text-zinc-200 flex items-center gap-1 shrink-0 border border-white/20">
                    <Camera className="w-2.5 h-2.5" />
                    {photoCount} photos
                  </span>
                )}
              </div>
            </div>

            {/* Body Content */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                {/* Festival Tag & Best Time */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md font-bold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                  >
                    {item.category}
                  </span>
                  {item.bestTime && (
                    <span className="text-[10px] font-mono text-[#7C8581] flex items-center gap-1 truncate">
                      <Clock className="w-3 h-3 text-[#A69B80]" />
                      <span className="truncate">{item.bestTime.split('&')[0].trim()}</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <Link href={`/experiences/${item.id}`} className="block group">
                  <h3 className="font-cormorant font-bold text-xl sm:text-2xl text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-snug">
                    {item.title}
                  </h3>
                </Link>

                {/* Description */}
                <p className="text-[#5C6460] text-xs sm:text-sm line-clamp-2 mt-2 leading-relaxed font-light">
                  {item.description}
                </p>
              </div>

              {/* Footer Info */}
              <div className="mt-5 pt-3.5 border-t border-[#D4CFC0]/70 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#7C8581] block">
                    Distance
                  </span>
                  <p className="font-bold font-mono text-[#347F8C] text-xs sm:text-sm">
                    {formattedDistance} away
                  </p>
                </div>

                <Link
                  href={`/experiences/${item.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] font-bold px-3.5 py-1.5 rounded-lg transition-all duration-300 shadow-sm shadow-[#347F8C]/20"
                >
                  <span>View Spot</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
