'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Camera, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface ExperienceGalleryProps {
  images: string[];
  title: string;
  city: string;
  area?: string;
}

export function ExperienceGallery({ images, title, city, area }: ExperienceGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Filter and deduplicate images
  const validImages = Array.from(
    new Set(images.filter((img) => typeof img === 'string' && img.trim().length > 0))
  ).map((url) => url.replace('thumb.wikimedia.org', 'upload.wikimedia.org'));

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev! > 0 ? prev! - 1 : validImages.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev! < validImages.length - 1 ? prev! + 1 : 0));
      }
    },
    [selectedIndex, validImages.length]
  );

  useEffect(() => {
    if (selectedIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedIndex, handleKeyDown]);

  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (validImages.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-[#D4CFC0]/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#347F8C]/15 flex items-center justify-center text-[#347F8C]">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-manifold text-xs sm:text-sm text-[#2C2C2C] uppercase tracking-wider font-bold">
            Field Dispatches & Archival Photography
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#2C2C2C]/60">
          {validImages.length} Visual Records
        </span>
      </div>

      {/* Grid of 5-6 images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {validImages.map((src, index) => {
          const isFailed = failedImages[src];
          // If this image failed, try using the first image as fallback, or show archival badge
          const fallbackSrc = !failedImages[validImages[0]] ? validImages[0] : null;

          return (
            <div
              key={index}
              onClick={() => setSelectedIndex(index)}
              className="group relative h-36 sm:h-44 rounded-xl overflow-hidden border border-[#D4CFC0] bg-[#EAE5D6] cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
            >
              {isFailed && !fallbackSrc ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#E0DACB] text-[#2C2C2C]/50 p-4 text-center">
                  <Camera className="w-6 h-6 mb-1 opacity-40" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Field Record {index + 1}</span>
                </div>
              ) : (
                <Image
                  src={isFailed && fallbackSrc ? fallbackSrc : src}
                  alt={`${title} — Plate ${index + 1}`}
                  fill
                  unoptimized
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                  onError={() => setFailedImages((prev) => ({ ...prev, [src]: true }))}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-2.5">
                <span className="text-[10px] font-mono text-white/90 truncate">
                  Plate {index + 1} {area ? `• ${area}` : `• ${city}`}
                </span>
                <span className="bg-white/20 backdrop-blur-md p-1 rounded text-white shrink-0">
                  <Maximize2 className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 select-none animate-fadeIn"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white/80 mb-4 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-white/60">
                {title}
              </span>
              <span className="text-white/40">•</span>
              <span className="font-mono text-xs text-amber-400">
                Plate {selectedIndex + 1} of {validImages.length}
              </span>
            </div>
            <button
              onClick={() => setSelectedIndex(null)}
              aria-label="Close image viewer"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Image Stage */}
          <div
            className="relative w-full max-w-5xl h-[65vh] sm:h-[75vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={
                failedImages[validImages[selectedIndex]] && !failedImages[validImages[0]]
                  ? validImages[0]
                  : validImages[selectedIndex]
              }
              alt={`${title} — Full plate ${selectedIndex + 1}`}
              fill
              unoptimized
              priority
              sizes="90vw"
              className="object-contain"
            />

            {/* Previous Button */}
            {validImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev! > 0 ? prev! - 1 : validImages.length - 1));
                }}
                aria-label="Previous photograph"
                className="absolute left-2 sm:-left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next Button */}
            {validImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev! < validImages.length - 1 ? prev! + 1 : 0));
                }}
                aria-label="Next photograph"
                className="absolute right-2 sm:-right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          <div
            className="flex items-center gap-2 mt-4 overflow-x-auto max-w-5xl py-2 px-2 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {validImages.map((thumb, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  selectedIndex === idx ? 'border-[#347F8C] scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <Image
                  src={thumb}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  unoptimized
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
