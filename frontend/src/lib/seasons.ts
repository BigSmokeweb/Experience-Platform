export interface SeasonalFestival {
  id: string;
  name: string;
  seasonId: string;
  tagline: string;
  monthsDescription?: string;
  image?: string;
  highlights?: string[];
}

export interface Season {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  months: number[]; // 1-indexed (Jan=1)
  festivals?: SeasonalFestival[];
}

export const SEASONS: Season[] = [
  {
    id: 'winter',
    name: 'Winter',
    icon: '❄️',
    tagline: 'Street food trails, festive fairs & night markets',
    months: [12, 1],
    festivals: [
      { id: 'kite-festival', name: 'Makar Sankranti & Kite Festival', seasonId: 'winter', tagline: 'Rooftop celebrations, artisanal sweets & lantern nights' },
      { id: 'christmas-newyear', name: 'Winter Heritage Fairs', seasonId: 'winter', tagline: 'Bandra illuminated walks & colonial architectural trails' },
    ],
  },
  {
    id: 'spring',
    name: 'Spring',
    icon: '🌸',
    tagline: 'Colour festivals, harvest carnivals & garden blooms',
    months: [2, 3],
    festivals: [
      { id: 'holi-spring', name: 'Holi & Vasant Utsav', seasonId: 'spring', tagline: 'Organic dye workshops, culinary feasts & musical gatherings' },
      { id: 'kala-ghoda', name: 'Cultural Arts & Heritage Weeks', seasonId: 'spring', tagline: 'Open-air craft galleries, folk dance & historic lanes' },
    ],
  },
  {
    id: 'summer',
    name: 'Summer',
    icon: '☀️',
    tagline: 'Coastal retreats, mango harvest fests & cool escapes',
    months: [4, 5, 6],
    festivals: [
      { id: 'alphonso-fest', name: 'Alphonso Mango Harvest Fests', seasonId: 'summer', tagline: 'Farm visits, artisanal pulp tastings & orchard trails' },
      { id: 'baisakhi-chaitra', name: 'Chaitra Navratri & New Year Celebrations', seasonId: 'summer', tagline: 'Traditional temple feasts & classical recitals' },
    ],
  },
  {
    id: 'monsoon',
    name: 'Monsoon',
    icon: '🌧️',
    tagline: 'Ganesh Utsav, waterfall trails & chai promenades',
    months: [7, 8, 9],
    festivals: [
      { id: 'ganesh-chaturthi', name: 'Ganeshutsav Celebrations', seasonId: 'monsoon', tagline: 'Artisan murti ateliers, dhol tasha processions & pandal trails' },
      { id: 'raksha-bandhan', name: 'Monsoon Waterfront Fests', seasonId: 'monsoon', tagline: 'Coastal fisherfolk blessings, heritage sea walks & petrichor trails' },
    ],
  },
  {
    id: 'autumn',
    name: 'Autumn',
    icon: '🍂',
    tagline: 'Diwali illumination, Garba nights & temple celebrations',
    months: [10, 11],
    festivals: [
      { id: 'navratri-garba', name: 'Navratri & Garba Evenings', seasonId: 'autumn', tagline: 'Nine nights of synchronized folk dancing & cultural attire' },
      { id: 'diwali-lights', name: 'Deepavali Festival of Lights', seasonId: 'autumn', tagline: 'Lantern bazaars, sweet-making ateliers & midnight markets' },
    ],
  },
];

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-indexed
  return SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[0];
}
