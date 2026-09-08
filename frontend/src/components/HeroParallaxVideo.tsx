'use client';

import { useEffect, useRef } from 'react';

export function HeroParallaxVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      video.style.transform = 'scale(1) translateZ(0)';
      video.style.opacity = '1';
      return;
    }

    let rafId: number | null = null;
    let isObserving = false;

    const updateTransform = (progress: number) => {
      // Cinematic depth pull: scale 1.0 -> 1.15
      const clampedProgress = Math.min(1, Math.max(0, progress));
      const scale = 1.0 + clampedProgress * 0.15;
      
      // Smooth cinematic fade out
      const opacity = Math.max(0, 1.0 - Math.pow(clampedProgress, 0.9) * 1.05);

      video.style.transform = `scale(${scale.toFixed(4)}) translate3d(0, ${(clampedProgress * 40).toFixed(2)}px, 0)`;
      video.style.opacity = `${opacity.toFixed(4)}`;
    };

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!container || !video) return;

        const rect = container.getBoundingClientRect();
        const height = rect.height || window.innerHeight;

        // Progress: 0 at top of hero, 1 when scrolled completely past hero
        const progress = Math.min(1, Math.max(0, -rect.top / height));
        updateTransform(progress);
      });
    };

    // Fine-grained thresholds for responsive IntersectionObserver tracking
    const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          if (video.paused) {
            video.play().catch(() => {});
          }
          if (!isObserving) {
            isObserving = true;
            window.addEventListener('scroll', handleScroll, { passive: true });
          }

          // Calculate progress directly from bounding rect and intersection
          const rect = entry.boundingClientRect;
          const height = rect.height || window.innerHeight;
          const progress = Math.min(1, Math.max(0, -rect.top / height));
          updateTransform(progress);
        } else {
          if (isObserving) {
            isObserving = false;
            window.removeEventListener('scroll', handleScroll);
          }
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          if (!video.paused) {
            video.pause();
          }
        }
      },
      {
        root: null,
        threshold: thresholds,
      }
    );

    observer.observe(container);
    handleScroll();

    return () => {
      observer.disconnect();
      if (isObserving) {
        window.removeEventListener('scroll', handleScroll);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Crystal Clear Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/images/hero-bg.png"
        aria-label="Scenic travel landscape background video"
        className="w-full h-full object-cover object-center will-change-transform"
        style={{
          transform: 'scale(1.0) translateZ(0)',
          opacity: 1,
        }}
      >
        <source src="/hero-bg-2.mp4" type="video/mp4" />
        <track
          kind="captions"
          src="data:text/vtt;charset=utf-8,WEBVTT%0A%0A1%0A00:00:00.000%20--%3E%2000:01:00.000%0AAtmospheric%20scenic%20travel%20landscape"
          srcLang="en"
          label="English"
        />
      </video>

      {/* Subtle top header gradient solely for navbar contrast */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

      {/* ─── Seamless Feathered Blend into 2nd Page (Exact Match to Screenshot) ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            to bottom,
            transparent 0%,
            transparent 50%,
            rgba(245, 241, 230, 0.08) 62%,
            rgba(245, 241, 230, 0.32) 74%,
            rgba(245, 241, 230, 0.70) 86%,
            rgba(245, 241, 230, 0.94) 95%,
            #F5F1E6 100%
          )`,
        }}
      />
    </div>
  );
}

export default HeroParallaxVideo;
