'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, ShieldCheck } from 'lucide-react';

interface ExperienceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  priceMin?: number;
  priceMax?: number;
  durationMinutes?: number;
  ratingAverage?: number;
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
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-exp-id');
            if (id) {
              setVisibleIds((prev) => {
                if (prev.has(id)) return prev;
                const next = new Set(prev);
                next.add(id);
                return next;
              });
            }
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        threshold: 0.08,
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
  const fallbackUrl = heroImage || 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=80';
  const rawUrl = exp.mediaUrls?.[0] || fallbackUrl;
  const initialUrl = rawUrl.replace('thumb.wikimedia.org', 'upload.wikimedia.org');
  const [imgSrc, setImgSrc] = useState(initialUrl);

  return (
    <article
      data-exp-id={exp.id}
      style={{
        transitionDelay: isVisible ? staggerDelay : '0ms',
      }}
      className={`city-experience-card group relative bg-white border border-[#D4CFC0] hover:border-[#347F8C]/60 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
            if (imgSrc !== fallbackUrl) {
              setImgSrc(fallbackUrl);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        <div className="absolute top-3.5 left-3.5">
          <span className="bg-[#2C2C2C]/85 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono tracking-wider text-[#F5F1E6] uppercase font-semibold">
            {exp.category}
          </span>
        </div>

        <div className="absolute top-3.5 right-3.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-[#2C2C2C] border border-[#D4CFC0] flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="font-semibold">{Number(exp.ratingAverage || 4.9).toFixed(2)}</span>
        </div>

        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white">
          <span className="text-[11px] font-mono text-white flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A69B80]" />
            {exp.provider?.businessName ? `Listed by ${exp.provider.businessName}` : 'Presented by a local connoisseur'}
          </span>
          <span className="text-[11px] font-mono text-white/90 flex items-center gap-1">
            <Clock className="w-3 h-3 text-white/80" />
            {exp.durationMinutes || 120} min
          </span>
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
          <Link
            href={`/experiences/${exp.id}`}
            aria-label={`Explore ${exp.title}`}
            className="group/btn inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] font-bold px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 shadow-sm"
          >
            <span>Explore</span>
            <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-1">&rarr;</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
