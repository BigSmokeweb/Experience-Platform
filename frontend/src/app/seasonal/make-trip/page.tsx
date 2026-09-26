import type { Metadata } from 'next';
import { getFestiveSeasonByCategory, getCurrentFestiveSeason } from '@/lib/festive-schedule';
import seasonalDataset from '@/lib/seasonal-dataset.json';
import { SeasonalTripBuilder } from '@/components/SeasonalTripBuilder';

export const metadata: Metadata = {
  title: 'Make a Trip — Curate Your Festival Journey | Journi',
  description:
    'Build a personalised multi-stop itinerary from Ganesh Utsav pandal spots and seasonal festival destinations across Mumbai MMR.',
};

export default function SeasonalMakeTripPage({
  searchParams,
}: {
  searchParams?: { festival?: string };
}) {
  const activeFestival = searchParams?.festival
    ? getFestiveSeasonByCategory(searchParams.festival)
    : getCurrentFestiveSeason();

  const experiences = (seasonalDataset as any[]).filter(
    (e) => e.category.toLowerCase() === activeFestival.category.toLowerCase()
  );

  return (
    <SeasonalTripBuilder
      stops={experiences}
      festivalLabel={activeFestival.badgeLabel}
      festivalCategory={activeFestival.category}
    />
  );
}
