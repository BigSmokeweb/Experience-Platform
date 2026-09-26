'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { resolveExperienceImageUrl, FALLBACK_EXPERIENCE_IMAGE } from '@/lib/image-utils';
import { useOperatingStatus } from '@/lib/operating-hours';

interface ExperienceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  priceMin?: number;
  priceMax?: number;
  durationMinutes?: number;
  ratingAverage?: number;
  reviewStars?: number;
  googleReviewStars?: number;
  openingTime?: string;
  closingTime?: string;
  operatingHours?: string;
  closedDays?: string;
  mediaUrls?: string[];
  provider?: { businessName?: string };
}

interface CityExperiencesGridProps {
  experiences: ExperienceItem[];
  heroImage: string;
}

export function CityExperiencesGrid({ experiences, heroImage }: CityExperiencesGridProps) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.city-experience-card');
    if (!cards.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-exp-id');
          if (!id) return;

          if (entry.isIntersecting) {
            setVisibleIds((prev) => {
              if (prev.has(id)) return prev;
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          } else if (entry.boundingClientRect.top > 0) {
            // Scrolled back up above the card -> reset visibility so it fades up again when scrolling down
            setVisibleIds((prev) => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        });
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    cards.forEach((card) => observerRef.current?.observe(card));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [experiences]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {experiences.map((exp, index) => {
        const isVisible = visibleIds.has(exp.id);
        const colIndex = index % 3;
        const staggerDelay = `${colIndex * 120}ms`;

        return (
          <CityExperienceCard
            key={exp.id}
            exp={exp}
            heroImage={heroImage}
            isVisible={isVisible}
            staggerDelay={staggerDelay}
          />
        );
      })}
    </div>
  );
}

function CityExperienceCard({
  exp,
  heroImage,
  isVisible,
  staggerDelay,
}: {
  exp: ExperienceItem;
  heroImage: string;
  isVisible: boolean;
  staggerDelay: string;
}) {
  const anyExp = exp as any;
  const rawUrl =
    anyExp.cover ||
    exp.mediaUrls?.[0] ||
    anyExp.metadata?.coverRow ||
    anyExp.metadata?.cover ||
    heroImage;
  const initialUrl = resolveExperienceImageUrl(rawUrl);
  const [imgSrc, setImgSrc] = useState(initialUrl);

  const ratingValue = Number(
    exp.reviewStars ?? exp.googleReviewStars ?? exp.ratingAverage ?? 4.8
  ).toFixed(2);

  const { isOpen } = useOperatingStatus({
    openingTime: exp.openingTime,
    closingTime: exp.closingTime,
    operatingHours: exp.operatingHours,
    closedDays: exp.closedDays,
  });

  return (
    <Link
      href={`/experiences/${exp.id}`}
      data-exp-id={exp.id}
      style={{
        transitionDelay: isVisible ? staggerDelay : '0ms',
      }}
      className={`city-experience-card group relative bg-white border border-[#D4CFC0] hover:border-[#347F8C]/60 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] block text-inherit no-underline cursor-pointer ${
        isVisible
          ? 'opacity-100 translate-y-0 shadow-sm hover:shadow-md'
          : 'opacity-0 translate-y-12 pointer-events-none'
      }`}
    >
      {/* Top Cover Image Stage */}
      <div className="relative h-60 w-full overflow-hidden bg-[#EAE5D6]">
        <Image
          src={imgSrc}
          alt={exp.title}
          fill
          unoptimized
          referrerPolicy="no-referrer"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={() => {
            const fallback = heroImage || FALLBACK_EXPERIENCE_IMAGE;
            if (imgSrc !== fallback) {
              setImgSrc(fallback);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        <div className="absolute top-3.5 left-3.5">
          <span className="bg-[#2C2C2C]/85 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono tracking-wider text-[#F5F1E6] uppercase font-semibold">
            {exp.category}
          </span>
        </div>

        <div className="absolute top-3.5 right-3.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm font-bold">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span>{ratingValue}</span>
        </div>
      </div>

      {/* Content & Action Stage */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-cormorant text-xl sm:text-2xl tracking-normal text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors line-clamp-2 leading-snug font-bold">
            {exp.title}
          </h3>
          <p className="mt-2.5 text-xs sm:text-sm text-[#2C2C2C]/80 line-clamp-2 font-light leading-relaxed">
            {exp.description}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-[#D4CFC0] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#2C2C2C]/60 block">
              Starting at
            </span>
            <p className="font-semibold font-cormorant oldstyle-nums text-[#2C2C2C] text-lg tracking-wide">
              {(!exp.priceMin && !exp.priceMax) || (exp.priceMin === 0 && exp.priceMax === 0)
                ? 'Free'
                : exp.priceMin === 0
                ? `Free – ₹${exp.priceMax?.toLocaleString()}`
                : `₹${exp.priceMin?.toLocaleString()} – ₹${exp.priceMax?.toLocaleString()}`}
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
}
