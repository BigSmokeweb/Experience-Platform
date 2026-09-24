import type { Metadata } from 'next';
import { SeasonalBackButton } from '@/components/SeasonalBackButton';
import { SeasonalDirectory } from '@/components/SeasonalDirectory';
import { getCurrentFestiveSeason, getFestiveSeasonByCategory } from '@/lib/festive-schedule';
import seasonalDataset from '@/lib/seasonal-dataset.json';

export const metadata: Metadata = {
  title: 'Seasonal Festivals & Spots — Journi',
  description: 'Discover active seasonal festivals, iconic pandals, and celebrations across Mumbai MMR.',
};

export default async function SeasonalPage({
  searchParams,
}: {
  searchParams?: { festival?: string };
}) {
  const activeFestival = searchParams?.festival
    ? getFestiveSeasonByCategory(searchParams.festival)
    : getCurrentFestiveSeason();

  // Show only relevant festival cards (e.g. only Ganesh Chaturthi when active)
  const experiences = (seasonalDataset as any[]).filter(
    (e) => e.category.toLowerCase() === activeFestival.category.toLowerCase()
  );

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen selection:bg-[#8B7355]/30 pt-24 pb-28">
      {/* Back Navigation with scroll restoration */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <SeasonalBackButton />
      </div>


      {/* Season & Festival Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="border-b border-[#C4A265] pb-10">
          <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4 sm:mb-5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {activeFestival.badgeLabel}
          </div>
          <h1 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-[60px] tracking-wide text-[#2C2C2C] leading-normal py-1">
            {activeFestival.headline}
          </h1>
          <p className="text-[#5C6460] text-sm sm:text-base mt-5 sm:mt-6 max-w-2xl font-light leading-relaxed">
            {activeFestival.tagline} Handpicked authentic spots and community celebrations across Mumbai MMR.
          </p>
        </div>
      </section>

      {/* Interactive Experience Directory (Only Active Festival Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SeasonalDirectory initialExperiences={experiences} />
      </section>
    </div>
  );
}
