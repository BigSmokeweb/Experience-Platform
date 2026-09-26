'use client';

import { useEffect, useRef, useState } from 'react';

interface LivingCatalogueHeaderProps {
  title?: string;
  badge?: string;
  subtitle?: string;
  as?: 'h1' | 'h2';
}

export function LivingCatalogueHeader({
  title = 'A Living Catalogue',
  badge = 'Our Curated Registry',
  subtitle = 'Dawn walks through centuries-old ateliers. Culinary traditions held in family kitchens since the Mughal courts. Each experience verified in person, on site.',
  as: HeadingTag = 'h2',
}: LivingCatalogueHeaderProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Respect reduced motion preference
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        setIsVisible(true);
        return;
      }
    }

    const currentEl = containerRef.current;
    if (!currentEl) return;

    // Check if element is already in viewport on mount (e.g. refreshed when scrolled)
    const rect = currentEl.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(currentEl);

    return () => {
      observer.disconnect();
    };
  }, []);

  const words = title.split(' ');

  return (
    <section ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="border-b border-[#C4A265] pb-10">
        {/* Eyebrow badge */}
        <div
          className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4 sm:mb-5 transition-all duration-700 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '0ms',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
          {badge}
        </div>

        {/* Masked Clip-Path Word Reveal Title (Apple product page style, staggered by 150ms) */}
        <HeadingTag className="font-eczar font-bold text-4xl sm:text-5xl lg:text-[60px] tracking-tight text-[#2C2C2C] leading-normal py-1">
          <span className="sr-only">{title}</span>
          <span aria-hidden="true" className="inline-block">
            {words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="inline-block overflow-hidden pb-2 -mb-2 mr-[0.28em] align-top"
                style={{
                  clipPath: 'inset(0 0 0 0)',
                  WebkitClipPath: 'inset(0 0 0 0)',
                }}
              >
                <span
                  className="inline-block will-change-transform transition-transform duration-750 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: isVisible ? 'translateY(0%)' : 'translateY(120%)',
                    transitionDelay: `${index * 150}ms`,
                  }}
                >
                  {word}
                </span>
              </span>
            ))}
          </span>
        </HeadingTag>

        {/* Subtitle statement */}
        <p
          className="text-[#5C6460] text-sm sm:text-base mt-5 sm:mt-6 max-w-2xl font-light leading-relaxed transition-all duration-700 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(14px)',
            transitionDelay: `${words.length * 150}ms`,
          }}
        >
          {subtitle}
        </p>
      </div>
    </section>
  );
}

export default LivingCatalogueHeader;
