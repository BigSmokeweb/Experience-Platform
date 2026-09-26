'use client';

import { useEffect, useRef } from 'react';

export function HeroParallaxVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Ensure video is properly muted and starts playback immediately
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => {
      // Autoplay fallback: start playback on first user touch/click if browser blocked autoplay
      const playOnInteract = () => {
        video.play().catch(() => {});
        window.removeEventListener('click', playOnInteract);
        window.removeEventListener('touchstart', playOnInteract);
      };
      window.addEventListener('click', playOnInteract, { once: true });
      window.addEventListener('touchstart', playOnInteract, { once: true });
    });

    const updateTransform = () => {
      const rect = container.getBoundingClientRect();
      const height = rect.height || window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / height));

      if (progress === 0) {
        video.style.transform = 'none';
        video.style.opacity = '1';
        return;
      }

      // Depth pull: scale 1.0 -> 1.15 and smooth fade out
      const scale = 1.0 + progress * 0.15;
      const opacity = Math.max(0, 1.0 - Math.pow(progress, 0.9) * 1.05);

      video.style.transform = `scale(${scale.toFixed(4)}) translateY(${(progress * 40).toFixed(2)}px)`;
      video.style.opacity = `${opacity.toFixed(4)}`;
    };

    window.addEventListener('scroll', updateTransform, { passive: true });
    return () => window.removeEventListener('scroll', updateTransform);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Cinematic Background Video with Poster Fallback */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
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

      {/* Subtle top header gradient solely for navbar contrast */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

      {/* Seamless Feathered Blend into 2nd Page (Soft mist at bottom ~20% only) */}
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
