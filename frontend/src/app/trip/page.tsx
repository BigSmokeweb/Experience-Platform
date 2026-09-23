'use client';

import { ItineraryBuilder } from '@/components/ItineraryBuilder';
import { BackButton } from '@/components/BackButton';

export default function TripPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      {/* Top Return to Previous Banner */}
      <div className="pt-24 pb-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton
          fallbackHref="/"
          label="Go Back"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/70 hover:text-[#347F8C] border border-[#D4CFC0] hover:border-[#347F8C] px-4 py-2 rounded-xl transition backdrop-blur-md bg-white shadow-sm cursor-pointer"
          iconClassName="w-3.5 h-3.5"
        />
      </div>

      {/* Redesigned Atelier Itinerary Builder */}
      <ItineraryBuilder />
    </div>
  );
}
