'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getCurrentSeason } from '@/lib/seasons';

export function SeasonalBanner() {
  const season = getCurrentSeason();

  const handleBannerClick = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('journi_return_scroll', window.scrollY.toString());
    }
  };

  return (
    <Link
      id="seasonal-spots"
      href="/seasonal"
      onClick={handleBannerClick}
      className="group block relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 my-8 sm:my-12 scroll-mt-24"
    >
      <div className="relative w-full h-[160px] sm:h-[200px] lg:h-[220px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-stone-900/15 border border-[#C4A265]/40">
        {/* Background Image — user will provide /images/seasonal-banner.jpg */}
        <Image
          src="/images/seasonal-banner.jpg"
          alt="Seasonal Spots"
          fill
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          priority={false}
          unoptimized
          onError={(e) => {
            // Hide the image on error so gradient fallback shows through
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 group-hover:to-black/10 transition-all duration-500" />

        {/* Fallback gradient when no image exists */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1a2e35] via-[#2A6772] to-[#347F8C]" />

        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-between px-6 sm:px-10 lg:px-14">
          {/* Left: Title & Season Info */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 text-white/70 font-mono text-[10px] sm:text-xs tracking-[0.28em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {season.icon} {season.name} Festival Season
            </div>
            <h2 className="font-edu-cursive font-normal text-3xl sm:text-4xl lg:text-5xl text-white tracking-wide leading-tight">
              Seasonal Spots
            </h2>
            <p className="text-white/70 text-xs sm:text-sm font-light max-w-sm leading-relaxed hidden sm:block">
              {season.tagline}. Curated for this time of the year.
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default SeasonalBanner;
