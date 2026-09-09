'use client';

export interface HostListing {
  id: string;
  title: string;
  category: string;
  city: string;
  state?: string;
  priceMin: number;
  priceMax: number;
  durationMinutes: number;
  status: 'PUBLISHED' | 'DRAFT';
  mediaUrls: string[];
  ratingAverage?: number;
  reviewCount?: number;
  description?: string;
  createdAt: string;
  providerId?: string;
}

const HOST_LISTINGS_KEY = 'journi_host_listings_v1';
export const HOST_LISTINGS_UPDATED_EVENT = 'journi:host_listings_updated';

// Curated starter listings that populate whenever a provider registers/logs in
export const DEFAULT_HOST_EXPERIENCES: HostListing[] = [
  {
    id: 'host-exp-mumbai-sailing',
    title: 'Marine Drive Sunset Sailing on Arabian Sea',
    category: 'ADVENTURE',
    city: 'Mumbai',
    state: 'Maharashtra',
    priceMin: 1800,
    priceMax: 3000,
    durationMinutes: 120,
    status: 'PUBLISHED',
    ratingAverage: 4.95,
    reviewCount: 118,
    description: 'Private 2-hour sailboat trip departing Gateway of India, catching the sunset with panoramic views of Queen’s Necklace skyline and harbor lighthouses.',
    mediaUrls: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'host-exp-bandra-heritage',
    title: 'Bandra Portuguese Quarter Heritage & Art Walk',
    category: 'CULTURE',
    city: 'Mumbai',
    state: 'Maharashtra',
    priceMin: 650,
    priceMax: 950,
    durationMinutes: 150,
    status: 'PUBLISHED',
    ratingAverage: 4.92,
    reviewCount: 84,
    description: 'Walk through century-old Ranwar village lanes, historic cross shrines, vibrant street art murals, and quaint artisanal bakeries with a born-and-raised local guide.',
    mediaUrls: [
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80'
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'host-exp-khotachiwadi-culinary',
    title: 'Girgaon Street Secrets & Khotachiwadi Heritage Feast',
    category: 'FOOD',
    city: 'Mumbai',
    state: 'Maharashtra',
    priceMin: 850,
    priceMax: 1400,
    durationMinutes: 180,
    status: 'PUBLISHED',
    ratingAverage: 4.98,
    reviewCount: 92,
    description: 'A curated walking food expedition through Girgaon chowk, savouring traditional Maharashtrian batata vada, fresh puran poli, and home-cooked tea in an authentic Portuguese-style heritage enclave.',
    mediaUrls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/AmulButterPaavbhaji_SardaarPavBhaji_Mumbai.jpg/1280px-AmulButterPaavbhaji_SardaarPavBhaji_Mumbai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Aran_Vada_Pav_Mumbai.jpg/1200px-Aran_Vada_Pav_Mumbai.jpg'
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
];

/**
 * Get host listings from localStorage. Initializes with default starter listings if empty.
 */
export function getHostListings(): HostListing[] {
  if (typeof window === 'undefined') return DEFAULT_HOST_EXPERIENCES;

  try {
    const raw = localStorage.getItem(HOST_LISTINGS_KEY);
    if (!raw) {
      // Seed default listings on first host visit/registration
      localStorage.setItem(HOST_LISTINGS_KEY, JSON.stringify(DEFAULT_HOST_EXPERIENCES));
      return DEFAULT_HOST_EXPERIENCES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    // If empty array stored, re-seed with default experiences
    localStorage.setItem(HOST_LISTINGS_KEY, JSON.stringify(DEFAULT_HOST_EXPERIENCES));
    return DEFAULT_HOST_EXPERIENCES;
  } catch {
    return DEFAULT_HOST_EXPERIENCES;
  }
}

/**
 * Add a newly created experience to the host's listings store
 */
export function addHostListing(listing: {
  id?: string;
  title: string;
  category: string;
  city: string;
  state?: string;
  priceMin?: number;
  priceMax?: number;
  durationMinutes?: number;
  status?: 'PUBLISHED' | 'DRAFT';
  mediaUrls?: string[];
  description?: string;
}): HostListing {
  const current = getHostListings();
  const newListing: HostListing = {
    id: listing.id || `exp-host-${Date.now()}`,
    title: listing.title,
    category: listing.category,
    city: listing.city,
    state: listing.state || 'Maharashtra',
    priceMin: listing.priceMin ?? 0,
    priceMax: listing.priceMax ?? 0,
    durationMinutes: listing.durationMinutes || 120,
    status: listing.status || 'PUBLISHED',
    mediaUrls: (listing.mediaUrls && listing.mediaUrls.length > 0) ? listing.mediaUrls : [
      'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80'
    ],
    ratingAverage: 5.0,
    reviewCount: 1,
    description: listing.description,
    createdAt: new Date().toISOString(),
  };

  const updated = [newListing, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(HOST_LISTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(HOST_LISTINGS_UPDATED_EVENT, { detail: newListing }));
  }
  return newListing;
}

/**
 * Seed initial host listings explicitly upon provider registration
 */
export function initializeHostListingsIfEmpty(): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(HOST_LISTINGS_KEY);
  if (!raw || JSON.parse(raw).length === 0) {
    localStorage.setItem(HOST_LISTINGS_KEY, JSON.stringify(DEFAULT_HOST_EXPERIENCES));
    window.dispatchEvent(new CustomEvent(HOST_LISTINGS_UPDATED_EVENT));
  }
}
