'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, ShieldCheck, Clock, Camera } from 'lucide-react';

import { useState } from 'react';
import { PlaceRatingWidget } from '@/components/PlaceRatingWidget';
import { resolveExperienceImageUrl } from '@/lib/image-utils';

interface ItineraryStopCardProps {
  id?: string;
  stopNumber: number;
  title: string;
  category: string;
  city: string;
  distanceKm: number;
  priceMin: number;
  priceMax: number;
  ratingAverage: number;
  authenticityRating: number;
  mediaUrl?: string;
  aiExplanation?: string;
  onRemove?: () => void;
  showRateAction?: boolean;
  sessionId?: string;
  onAddMemory?: (experienceId: string, title: string) => void;
}

export function ItineraryStopCard({
  id,
  stopNumber,
  title,
  category,
  city,
  distanceKm,
  priceMin,
  priceMax,
  ratingAverage,
  authenticityRating,
  mediaUrl,
  aiExplanation,
  onRemove,
  showRateAction = false,
  sessionId,
  onAddMemory,
}: ItineraryStopCardProps) {
  const router = useRouter();
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const handleClick = () => {
    if (id) {
      router.push(`/experiences/${id}`);
    }
  };

  return (
    <div
      id={`itinerary-stop-${stopNumber}`}
      onClick={handleClick}
      className={`flex gap-4 bg-white border border-[#D4CFC0] hover:border-[#347F8C]/50 rounded-2xl p-4 shadow-sm transition-all duration-300 items-start text-[#2C2C2C] ${id ? 'cursor-pointer hover:shadow-md group' : ''}`}
      title={id ? 'Click to view full experience details' : undefined}
    >
      {/* Stop number badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#347F8C] text-white flex items-center justify-center text-xs font-mono font-bold shadow-sm">
        {stopNumber}
      </div>

      {/* Thumbnail */}
      {mediaUrl && (
        <div className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-[#F5F1E6] border border-[#D4CFC0] hidden sm:block">
          <Image
            src={resolveExperienceImageUrl(mediaUrl)}
            alt={title}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-semibold">
            {(!category || category.toUpperCase().includes('HIDDEN')) ? 'LOCAL EXPERIENCE' : category.replace(/_/g, ' ')}
          </span>
          <span className="text-[#D4CFC0] text-xs">&bull;</span>
          <span className="text-[10px] font-mono text-[#2C2C2C]/70 uppercase">{city}</span>
          {distanceKm > 0 && (
            <>
              <span className="text-[#D4CFC0] text-xs">&bull;</span>
              <span className="text-[10px] font-mono text-[#2C2C2C]/70">{distanceKm.toFixed(1)} km</span>
            </>
          )}
        </div>

        <h3 className="font-cormorant font-bold text-[#2C2C2C] text-base sm:text-lg leading-snug line-clamp-2">
          {title}
        </h3>

        {/* Pricing & Rating */}
        <div className="flex items-center gap-3 mt-2 text-xs font-mono text-[#2C2C2C]/75">
          <span className="text-[#2C2C2C] font-semibold">
            {!priceMin || priceMin === 0 ? 'Free' : `₹${priceMin.toLocaleString()}`}
          </span>
          <span className="text-[#D4CFC0]">&bull;</span>
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            {Number(ratingAverage || 4.9).toFixed(1)}
          </span>
          <span className="text-[#D4CFC0]">&bull;</span>
          <span className="text-[#A69B80] font-semibold">{Math.round((authenticityRating || 0.95) * 100)}% Authenticity</span>
        </div>
        {/* Action buttons: Rate Visit & Add Memory */}
        {showRateAction && id && (
          <div className="mt-3 pt-2.5 border-t border-[#D4CFC0]/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRatingOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#347F8C] hover:text-[#2A6772] bg-[#F5F1E6] hover:bg-[#EBE5D8] font-bold px-3 py-1.5 rounded-lg border border-[#D4CFC0] transition shadow-2xs active:scale-95 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Rate Visit</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddMemory) {
                    onAddMemory(id, title);
                  } else {
                    router.push(`/journal/${sessionId || 'active'}/memories?experienceId=${id}`);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#8B7355] hover:text-[#725E45] bg-[#F5F1E6] hover:bg-[#EBE5D8] font-bold px-3 py-1.5 rounded-lg border border-[#D4CFC0] transition shadow-2xs active:scale-95 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#8B7355]" />
                <span>Add Memory</span>
              </button>
            </div>
            <span className="text-[10px] font-mono text-[#7C8581]">
              Post-visit verification
            </span>
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-[#2C2C2C]/40 hover:text-red-500 transition-colors text-xs font-mono p-1"
          title="Remove Stop"
        >
          ✕
        </button>
      )}

      {/* Rating Modal for Completed Visit */}
      {isRatingOpen && id && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsRatingOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-[#D4CFC0] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsRatingOpen(false)}
              className="absolute top-4 right-4 text-[#7C8581] hover:text-[#2C2C2C] font-mono text-sm p-1.5 rounded-full hover:bg-[#F5F1E6] transition cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
            <PlaceRatingWidget
              experienceId={id}
              experienceTitle={title}
              verified={true}
              onRatingSubmitted={() => {
                setTimeout(() => setIsRatingOpen(false), 1500);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
