'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentFestiveSeason } from '@/lib/festive-schedule';

export function SeasonalBanner() {
  const activeFestival = useMemo(() => getCurrentFestiveSeason(), []);

  const handleBannerClick = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('journi_return_scroll', window.scrollY.toString());
    }
  };

  return (
    <section id="seasonal-spots" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 my-10 sm:my-14 scroll-mt-24">
      {/* ─── BANNER (CLICKABLE TO /seasonal) ─── */}
      <Link
        href="/seasonal"
        onClick={handleBannerClick}
        aria-label={`Explore ${activeFestival.name} Trails & Celebrations`}
        className="group block relative w-full h-[160px] sm:h-[200px] lg:h-[220px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-stone-900/15 border border-[#C4A265]/40"
      >
        {/* Background Image: Dynamic based on active festival */}
        <Image
          src={activeFestival.bannerImage}
          alt={activeFestival.name}
          fill
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          priority={false}
          unoptimized
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Dark overlay for text contrast (softer on right so art is visible) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent group-hover:from-black/65 group-hover:via-black/30 group-hover:to-transparent transition-all duration-500" />

        {/* Fallback gradient when no image exists */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1a2e35] via-[#2A6772] to-[#347F8C]" />

        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-between px-6 sm:px-10 lg:px-14">
          <div className="flex flex-col gap-2 sm:gap-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-white/80 font-mono text-[10px] sm:text-xs tracking-[0.28em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {activeFestival.badgeLabel}
            </div>
            <h2 className="font-edu-cursive font-normal text-3xl sm:text-4xl lg:text-5xl text-white tracking-wide leading-tight drop-shadow-sm">
              {activeFestival.headline}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm font-light max-w-xl leading-relaxed hidden sm:block">
              {activeFestival.tagline}
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
}

export default SeasonalBanner;
