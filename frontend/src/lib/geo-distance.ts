export interface GeoPoint {
  lat: number;
  lng: number;
}

export const REGIONAL_PRESETS: Record<string, { label: string; lat: number; lng: number }> = {
  thane: { label: 'Thane', lat: 19.2183, lng: 72.9781 },
  'kalyan-dombivli': { label: 'Kalyan-Dombivli', lat: 19.2211, lng: 73.0919 },
  powai: { label: 'Powai', lat: 19.1197, lng: 72.9051 },
  'kanjur-marg': { label: 'Kanjur Marg', lat: 19.1300, lng: 72.9300 },
  mumbai: { label: 'Mumbai', lat: 18.9910, lng: 72.8360 },
  'navi-mumbai': { label: 'Navi Mumbai', lat: 19.0330, lng: 73.0297 },
  panvel: { label: 'Panvel', lat: 18.9894, lng: 73.1175 },
};

/**
 * Great-circle distance using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Recommends and sorts experiences strictly by distance to user, with no other variables.
 */
export function sortExperiencesByLocation<T extends { candidateLat?: number; candidateLng?: number }>(
  items: T[],
  userLat: number,
  userLng: number
): (T & { distanceKm: number })[] {
  return items
    .map((item) => {
      const lat = typeof item.candidateLat === 'number' ? item.candidateLat : userLat;
      const lng = typeof item.candidateLng === 'number' ? item.candidateLng : userLng;
      const distanceKm = calculateDistanceKm(userLat, userLng, lat, lng);
      return {
        ...item,
        distanceKm,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
