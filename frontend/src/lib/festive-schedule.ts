export interface FestiveSeason {
  id: 'ganesh-chaturthi' | 'navaratri' | 'diwali';
  category: 'Ganesh Chaturthi' | 'Navaratri' | 'Diwali';
  name: string;
  headline: string;
  tagline: string;
  badgeLabel: string;
  bannerImage: string;
}

export const FESTIVE_SEASONS: Record<string, FestiveSeason> = {
  'ganesh-chaturthi': {
    id: 'ganesh-chaturthi',
    category: 'Ganesh Chaturthi',
    name: 'Ganesh Chaturthi',
    headline: 'Ganesh Utsav Pandal Trails & Celebrations',
    tagline: 'Iconic pandals, artisan murti ateliers & traditional Dhol-Tasha processions across Mumbai MMR.',
    badgeLabel: 'Ganesh Chaturthi Utsav',
    bannerImage: '/images/ganpati-banner.jpg',
  },
  navaratri: {
    id: 'navaratri',
    category: 'Navaratri',
    name: 'Navaratri & Garba',
    headline: 'Navaratri Garba Nights & Folk Celebrations',
    tagline: 'Nine nights of vibrant folk Dandiya, live Gujarati orchestras & illuminated community grounds.',
    badgeLabel: 'Navaratri & Garba Utsav',
    bannerImage: '/images/ganpati-banner.jpg',
  },
  diwali: {
    id: 'diwali',
    category: 'Diwali',
    name: 'Diwali',
    headline: 'Deepavali Festival of Lights & Night Bazaars',
    tagline: 'Luminous light trails, artisanal faral sweet markets & festive night bazaars across the city.',
    badgeLabel: 'Diwali Festivities',
    bannerImage: '/images/ganpati-banner.jpg',
  },
};

/**
 * Returns the active festive season based on the real-time calendar date.
 * - Late Aug - Sept (Month 9): Ganesh Chaturthi
 * - Early to Mid Oct (Month 10, day <= 20): Navaratri
 * - Late Oct - Nov (Month 10 day > 20 or Month 11): Diwali
 */
export function getCurrentFestiveSeason(date: Date = new Date()): FestiveSeason {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // September: Ganesh Chaturthi
  if (month === 9 || (month === 8 && day >= 20)) {
    return FESTIVE_SEASONS['ganesh-chaturthi'];
  }

  // October 1 - 20: Navaratri
  if (month === 10 && day <= 20) {
    return FESTIVE_SEASONS.navaratri;
  }

  // Late October to November: Diwali
  if (month === 11 || (month === 10 && day > 20)) {
    return FESTIVE_SEASONS.diwali;
  }

  // Default to Ganesh Chaturthi as the foundational regional festival
  return FESTIVE_SEASONS['ganesh-chaturthi'];
}

export function getFestiveSeasonByCategory(category?: string | null): FestiveSeason {
  if (!category) return getCurrentFestiveSeason();
  const cat = category.toLowerCase();
  if (cat.includes('ganesh') || cat.includes('ganpati')) {
    return FESTIVE_SEASONS['ganesh-chaturthi'];
  }
  if (cat.includes('nava') || cat.includes('garba')) {
    return FESTIVE_SEASONS.navaratri;
  }
  if (cat.includes('diwali') || cat.includes('deepavali')) {
    return FESTIVE_SEASONS.diwali;
  }
  return getCurrentFestiveSeason();
}
