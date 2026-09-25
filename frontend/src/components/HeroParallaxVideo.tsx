'use client';

import { useEffect, useRef, useState } from 'react';

export function HeroParallaxVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    // Only mount and stream heavy 15MB MP4 video on viewports >= 768px (tablets & desktop) or after idle callback
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        setShouldLoadVideo(true);
      } else if ('requestIdleCallback' in window) {
        // Defer video on mobile until main thread is completely idle
        const handle = (window as any).requestIdleCallback(
          () => setShouldLoadVideo(true),
          { timeout: 4000 }
        );
        return () => {
          if ('cancelIdleCallback' in window) (window as any).cancelIdleCallback(handle);
        };
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !shouldLoadVideo) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      video.style.transform = 'none';
      video.style.opacity = '1';
      return;
    }

    let rafId: number | null = null;
    let isObserving = false;

    const updateTransform = (progress: number) => {
      const clampedProgress = Math.min(1, Math.max(0, progress));
      if (clampedProgress === 0) {
        video.style.transform = 'none';
        video.style.opacity = '1';
        return;
      }

      // Cinematic depth pull: scale 1.0 -> 1.15
      const scale = 1.0 + clampedProgress * 0.15;
      
      // Smooth cinematic fade out
      const opacity = Math.max(0, 1.0 - Math.pow(clampedProgress, 0.9) * 1.05);

      // Clean 2D transform avoids Chromium 3D GPU texture downsampling
      video.style.transform = `scale(${scale.toFixed(4)}) translateY(${(clampedProgress * 40).toFixed(2)}px)`;
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
      {/* Crystal Clear Video / Poster Fallback */}
      {shouldLoadVideo ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/images/hero-bg.png"
          aria-label="Scenic travel landscape background video"
          className="w-full h-full object-cover object-center"
          style={{
            transform: 'none',
            opacity: 1,
            imageRendering: '-webkit-optimize-contrast',
            filter: 'contrast(1.04) brightness(1.01)',
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
      ) : (
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/hero-bg.png')",
            filter: 'contrast(1.04) brightness(1.01)',
          }}
          aria-label="Scenic travel landscape background"
        />
      )}

      {/* Subtle top header gradient solely for navbar contrast */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

      {/* ─── Seamless Feathered Blend into 2nd Page (Soft mist at bottom ~20% only) ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            to bottom,
            transparent 0%,
            transparent 72%,
            rgba(245, 241, 230, 0.08) 80%,
            rgba(245, 241, 230, 0.28) 87%,
            rgba(245, 241, 230, 0.65) 93%,
            rgba(245, 241, 230, 0.92) 97%,
            #F5F1E6 100%
          )`,
        }}
      />
    </div>
  );
}

export default HeroParallaxVideo;
