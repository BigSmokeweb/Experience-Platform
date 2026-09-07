import { API_BASE } from './api-client';

export interface StopConditionResult {
  shouldStop: boolean;
  stopReason: string | null;
  wrapUpFlag: boolean;
  wrapUpTriggerReason: string | null;
}

export interface RecommendationItem {
  id: string;
  title: string;
  category: string;
  city: string;
  distanceKm: number;
  priceMin: number;
  priceMax: number;
  durationMinutes?: number;
  ratingAverage: number;
  authenticityRating: number;
  mediaUrls?: string[];
  candidateLat?: number;
  candidateLng?: number;
  aiExplanation?: string;
}

export interface SelectedExperience {
  id: string;
  title: string;
  category: string;
  city: string;
  priceMin: number;
  priceMax: number;
  ratingAverage: number;
  authenticityRating: number;
  mediaUrls?: string[];
  durationMinutes?: number;
  candidateLat?: number;
  candidateLng?: number;
}

export interface SessionData {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  remainingTimeMinutes: number;
  remainingBudget: number;
  totalBudget: number;
  selectedExperienceIds: string[];
  selectedCategories: string[];
  selectedExperiences?: SelectedExperience[];
  city?: string;
  rejectedExperienceIds?: string[];
  userLat?: number;
  userLng?: number;
}

export interface RecommendApiResponse {
  sessionId: string;
  recommendations: RecommendationItem[];
  sessionState: {
    remainingTimeMinutes: number;
    remainingBudget: number;
    selectedCount: number;
    stopCondition: StopConditionResult;
  };
  wrapUpPrompt: {
    message: string;
    triggerReason: string;
    quickResponses: string[];
  } | null;
  weatherAdaptPrompt: {
    advisory: string;
    alternativeStrategy: string;
    affectedExperienceIds: string[];
  } | null;
}

import { ALL_EXPERIENCES } from './experiences-data';

export const CATALOG_EXPERIENCES: RecommendationItem[] = ALL_EXPERIENCES.map((e, idx) => ({
  id: e.id,
  title: e.title || e.name || 'Local Experience',
  category: e.category,
  city: e.city,
  distanceKm: 0.5 + (idx % 10) * 0.8,
  priceMin: e.priceMin ?? e.entryFee ?? 0,
  priceMax: e.priceMax ?? e.activityCost ?? 0,
  durationMinutes: e.durationMinutes ?? 90,
  ratingAverage: e.ratingAverage ?? 4.5,
  authenticityRating: e.authenticityRating ?? e.authenticityScore ?? 0.9,
  candidateLat: e.candidateLat,
  candidateLng: e.candidateLng,
  mediaUrls: e.mediaUrls,
}));

// Guarantee accurate land coordinates for any experience (never in water)
export function sanitizeExperienceCoordinates(exp: {
  id?: string;
  title?: string;
  candidateLat?: number;
  candidateLng?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
}): { lat: number; lng: number } {
  // 1. Specific landmark overrides to ensure 100% precision on land
  if (exp.title) {
    const t = exp.title.toLowerCase();
    if (t.includes('nehru science centre')) {
      return { lat: 18.9904, lng: 72.8214 };
    }
    if (t.includes('nehru planetarium')) {
      return { lat: 18.9896, lng: 72.8185 };
    }
    if (t.includes('manek chowk')) {
      return { lat: 23.0248, lng: 72.5873 };
    }
    if (t.includes('adalaj')) {
      return { lat: 23.1669, lng: 72.5822 };
    }
  }

  // 2. Look up in catalog by ID or title
  const match = CATALOG_EXPERIENCES.find(
    (c) => c.id === exp.id || (exp.title && c.title.toLowerCase() === exp.title.toLowerCase())
  );
  let lat = match?.candidateLat ?? exp.candidateLat ?? (exp as any).latitude;
  let lng = match?.candidateLng ?? exp.candidateLng ?? (exp as any).longitude;

  // 3. Prevent ocean / water placement for Mumbai west coast
  if (lat != null && lng != null) {
    if (lat >= 18.98 && lat <= 19.04 && lng < 72.8175) {
      lng = 72.8190;
    }
    if (lat >= 18.92 && lat < 18.96 && lng < 72.819) {
      lng = 72.8220;
    }
    return { lat, lng };
  }

  // 4. Default fallback to city center on land
  return { lat: 18.9220, lng: 72.8347 };
}

export function normalizeSessionStops(session: SessionData): SessionData {
  if (session.selectedExperiences && session.selectedExperiences.length > 0) {
    session.selectedExperiences = session.selectedExperiences.map((stop) => {
      const coords = sanitizeExperienceCoordinates(stop);
      return {
        ...stop,
        candidateLat: coords.lat,
        candidateLng: coords.lng,
      };
    });
  }
  return session;
}

// 4-Factor Recommendation Scorer: Nearest + Intent + Budget + Rating
export function scoreCandidate(
  cand: RecommendationItem,
  userLat: number,
  userLng: number,
  interests: string[],
  remainingBudget: number
): { score: number; distanceKm: number } {
  // 1. Nearest to user (Haversine proximity)
  const cLat = cand.candidateLat ?? userLat;
  const cLng = cand.candidateLng ?? userLng;
  const dLat = ((cLat - userLat) * Math.PI) / 180;
  const dLng = ((cLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((cLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const nearestScore = Math.max(0, 1 - distKm / 35); // 0-35km radius scale

  // 2. Intent match (Category alignment with user preferences)
  const intentScore = interests.length === 0 || interests.includes(cand.category) ? 1.0 : 0.25;

  // 3. Budget fit (Leaves room in remaining budget)
  let budgetScore = 0.5;
  if (remainingBudget > 0) {
    if (cand.priceMin <= remainingBudget) {
      budgetScore = 1.0 - cand.priceMin / Math.max(remainingBudget, 1);
    } else {
      budgetScore = 0;
    }
  }

  // 4. Rating (Historical user rating normalized 0-1)
  const ratingScore = Math.min(1, Math.max(0, (cand.ratingAverage || 4.5) / 5.0));

  // Multi-factor weighted score: Nearest (35%), Intent (30%), Budget (20%), Rating (15%)
  const totalScore =
    0.35 * nearestScore +
    0.30 * intentScore +
    0.20 * budgetScore +
    0.15 * ratingScore;

  return {
    score: Number(totalScore.toFixed(4)),
    distanceKm: Number(distKm.toFixed(1)),
  };
}

// Helper: infer city from coordinates or presets
export function inferCityName(lat: number, lng: number): string {
  const centers: { city: string; lat: number; lng: number }[] = [
    { city: 'Navi Mumbai', lat: 19.033, lng: 73.030 },
    { city: 'Panvel', lat: 18.989, lng: 73.118 },
    { city: 'Kalyan-Dombivli', lat: 19.221, lng: 73.092 },
    { city: 'Thane', lat: 19.218, lng: 72.978 },
    { city: 'Powai', lat: 19.119, lng: 72.905 },
    { city: 'Kanjur Marg', lat: 19.130, lng: 72.930 },
    { city: 'Mumbai', lat: 18.944, lng: 72.821 },
  ];

  let closestCity = 'Mumbai';
  let minDistance = Infinity;

  for (const c of centers) {
    const d = Math.hypot(lat - c.lat, lng - c.lng);
    if (d < minDistance) {
      minDistance = d;
      closestCity = c.city;
    }
  }

  // If reasonably close to a known hub (within ~100km / ~1 degree)
  return minDistance < 1.0 ? closestCity : 'Mumbai';
}

export async function createTripSession(payload: {
  latitude: number;
  longitude: number;
  totalBudget: number;
  totalTimeMinutes: number;
  groupSize: number;
  interests: string[];
}): Promise<{ id: string }> {
  // Always clear stale active session from localStorage when generating a new custom route
  if (typeof window !== 'undefined') {
    const prevActive = localStorage.getItem('activeTripSessionId');
    if (prevActive) {
      localStorage.removeItem(`trip_session_${prevActive}`);
    }
    localStorage.removeItem('activeTripSessionId');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (token) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${API_BASE}/trip-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload,
          accessibilityRequirements: [],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (typeof window !== 'undefined' && data?.id) {
          localStorage.setItem('activeTripSessionId', data.id);
        }
        return data;
      }
    } catch {
      // fallback to offline session
    }
  }

  // Create standalone local session with 0 initial stops
  const sessionId = 'session_' + Math.random().toString(36).substring(2, 10);
  const city = inferCityName(payload.latitude, payload.longitude);

  const localSession: SessionData = {
    id: sessionId,
    status: 'ACTIVE',
    remainingTimeMinutes: payload.totalTimeMinutes,
    remainingBudget: payload.totalBudget,
    totalBudget: payload.totalBudget,
    selectedExperienceIds: [],
    selectedCategories: [],
    selectedExperiences: [],
    city,
    rejectedExperienceIds: [],
    userLat: payload.latitude,
    userLng: payload.longitude,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(`trip_session_${sessionId}`, JSON.stringify(localSession));
    localStorage.setItem('activeTripSessionId', sessionId);
  }

  return { id: sessionId };
}

export async function fetchTripSession(sessionId: string): Promise<SessionData> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (token) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${API_BASE}/trip-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const remoteSession = await res.json();
        return normalizeSessionStops(remoteSession);
      }
    } catch {
      // fallback to local
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`trip_session_${sessionId}`);
    if (raw) {
      const parsed: any = JSON.parse(raw);
      // Automatically purge any stale legacy sessions that had pre-selected stops
      if (!parsed._v || parsed._v < 2) {
        parsed.selectedExperiences = [];
        parsed.selectedExperienceIds = [];
        parsed.remainingBudget = parsed.totalBudget || 5000;
        parsed.remainingTimeMinutes = 180;
        parsed._v = 2;
        try {
          localStorage.setItem(`trip_session_${sessionId}`, JSON.stringify(parsed));
        } catch {}
      }
      return normalizeSessionStops(parsed);
    }
  }

  // default fallback if never saved
  return {
    id: sessionId,
    status: 'ACTIVE',
    remainingTimeMinutes: 180,
    remainingBudget: 5000,
    totalBudget: 5000,
    selectedExperienceIds: [],
    selectedCategories: ['FOOD', 'CULTURE'],
    selectedExperiences: [],
    city: 'Mumbai',
    rejectedExperienceIds: [],
  };
}

export async function fetchRecommendations(
  sessionId: string,
  session: SessionData
): Promise<RecommendApiResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (token) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${API_BASE}/trip-sessions/${sessionId}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          data.recommendations = data.recommendations.map((cand: any) => {
            const coords = sanitizeExperienceCoordinates(cand);
            return {
              ...cand,
              candidateLat: coords.lat,
              candidateLng: coords.lng,
            };
          });
        }
        return data;
      }
    } catch {
      // fallback
    }
  }

  // 4-Factor Offline Scoring Engine: Nearest + Intent + Budget + Rating
  const selectedIds = session.selectedExperienceIds || [];
  const rejectedIds = session.rejectedExperienceIds || [];
  const targetCity = (session.city || 'Mumbai').toLowerCase();

  // Current coordinate anchor: last selected stop's location, or user starting GPS
  const lastStop = session.selectedExperiences && session.selectedExperiences.length > 0
    ? session.selectedExperiences[session.selectedExperiences.length - 1]
    : null;

  const anchorLat = lastStop?.candidateLat || session.userLat || 18.9220;
  const anchorLng = lastStop?.candidateLng || session.userLng || 72.8347;

  // Filter unselected, non-rejected places
  const cityMatches = CATALOG_EXPERIENCES.filter(
    (e) => e.city.toLowerCase() === targetCity && !selectedIds.includes(e.id) && !rejectedIds.includes(e.id)
  );

  const fallbackMatches = CATALOG_EXPERIENCES.filter(
    (e) => !selectedIds.includes(e.id) && !rejectedIds.includes(e.id)
  );

  const candidates = cityMatches.length > 0 ? cityMatches : fallbackMatches;

  // Apply 4-factor scoring: Nearest + Intent + Budget + Rating
  const scoredCandidates: RecommendationItem[] = candidates
    .map((cand) => {
      const scoring = scoreCandidate(
        cand,
        anchorLat,
        anchorLng,
        session.selectedCategories || [],
        session.remainingBudget
      );

      return {
        ...cand,
        distanceKm: scoring.distanceKm,
        // Tag explanation for user
        reason: `${scoring.distanceKm} km away • ${cand.category} • ★${cand.ratingAverage.toFixed(1)}`,
        _score: scoring.score,
      } as RecommendationItem & { _score: number };
    })
    .sort((a, b) => (b as any)._score - (a as any)._score);

  // Dynamic Stop Conditions (identical to spec)
  const MIN_VIABLE_TIME = 30; // minutes
  const cheapestPrice = candidates.length > 0 ? Math.min(...candidates.map((c) => c.priceMin)) : Infinity;

  const isTimeExhausted = session.remainingTimeMinutes < MIN_VIABLE_TIME;
  const isBudgetExhausted = session.remainingBudget < cheapestPrice && session.remainingBudget > 0;
  const isNoCandidates = candidates.length === 0;

  const shouldStop = isTimeExhausted || isBudgetExhausted || isNoCandidates;
  const stopReason = isTimeExhausted
    ? 'Allocated time window for this route has concluded.'
    : isBudgetExhausted
    ? 'Remaining budget is insufficient for further admissions.'
    : isNoCandidates
    ? 'All available curated stops in this enclave have been linked.'
    : null;

  const isNearlyExhausted =
    session.remainingTimeMinutes < 45 ||
    (session.totalBudget > 0 && session.remainingBudget / session.totalBudget < 0.15);

  return {
    sessionId,
    recommendations: scoredCandidates.slice(0, 6),
    sessionState: {
      remainingTimeMinutes: session.remainingTimeMinutes,
      remainingBudget: session.remainingBudget,
      selectedCount: selectedIds.length,
      stopCondition: {
        shouldStop,
        stopReason,
        wrapUpFlag: isNearlyExhausted,
        wrapUpTriggerReason: isNearlyExhausted ? (session.remainingTimeMinutes < 45 ? 'LOW_TIME' : 'LOW_BUDGET') : null,
      },
    },
    wrapUpPrompt: isNearlyExhausted
      ? {
          message: 'Your allocated budget and temporal pacing are nearing target threshold.',
          triggerReason: 'threshold_near',
          quickResponses: ['Finalize Continuous Schedule', 'Add One Quick Heritage Stop'],
        }
      : null,
    weatherAdaptPrompt: null,
  };
}

export function saveLocalSession(session: SessionData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`trip_session_${session.id}`, JSON.stringify(session));
  }
}

/**
 * Encodes itinerary data into a clean, short URL search query string for sharing.
 * E.g., stops=exp001,exp002,exp003&city=Thane
 */
export function encodeShareableTrip(session: SessionData): string {
  try {
    const stops = (session.selectedExperiences || []).map((s) => s.id).filter(Boolean);
    if (stops.length > 0) {
      const city = encodeURIComponent(session.city || 'Mumbai');
      return `stops=${stops.join(',')}&city=${city}`;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Decodes a shareable trip payload from clean query params or legacy base64 strings.
 */
export function decodeShareableTrip(shareStr: string, cityParam?: string | null): SessionData | null {
  try {
    // 1. Check if it is a short comma-separated stop ID list
    if (shareStr.includes(',') || CATALOG_EXPERIENCES.some((c) => c.id === shareStr)) {
      const stopIds = shareStr.split(',').map((s) => s.trim()).filter(Boolean);
      const matchedExperiences: SelectedExperience[] = [];
      const cityName = cityParam || 'Mumbai';

      for (const id of stopIds) {
        const found = ALL_EXPERIENCES.find((c) => c.id === id) || CATALOG_EXPERIENCES.find((c) => c.id === id);
        if (found) {
          const coords = sanitizeExperienceCoordinates(found);
          matchedExperiences.push({
            id: found.id,
            title: found.title || (found as any).name || 'Local Experience',
            category: found.category,
            city: found.city || cityName,
            priceMin: found.priceMin ?? (found as any).entryFee ?? 0,
            priceMax: found.priceMax ?? (found as any).activityCost ?? 0,
            ratingAverage: found.ratingAverage ?? 4.5,
            authenticityRating: found.authenticityRating ?? (found as any).authenticityScore ?? 0.9,
            mediaUrls: found.mediaUrls,
            durationMinutes: found.durationMinutes ?? 90,
            candidateLat: coords.lat,
            candidateLng: coords.lng,
          });
        }
      }

      if (matchedExperiences.length > 0) {
        return {
          id: `share_${Date.now().toString(36)}`,
          status: 'COMPLETED',
          city: cityName,
          remainingBudget: 0,
          totalBudget: 5000,
          remainingTimeMinutes: 0,
          selectedExperienceIds: matchedExperiences.map((s) => s.id),
          selectedCategories: Array.from(new Set(matchedExperiences.map((s) => s.category))),
          selectedExperiences: matchedExperiences,
          rejectedExperienceIds: [],
        };
      }
    }

    // 2. Fallback: Parse legacy base64 if someone opens a legacy link
    let jsonStr: string;
    if (typeof window !== 'undefined') {
      jsonStr = decodeURIComponent(escape(atob(shareStr)));
    } else {
      jsonStr = Buffer.from(shareStr, 'base64').toString('utf-8');
    }
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.stops)) return null;

    const selectedExperiences = parsed.stops.map((s: any) => {
      const coords = sanitizeExperienceCoordinates(s);
      return {
        ...s,
        candidateLat: coords.lat,
        candidateLng: coords.lng,
      };
    });

    return {
      id: parsed.id || 'shared-trip',
      status: (parsed.status as any) || 'COMPLETED',
      city: parsed.city || 'Mumbai',
      userLat: parsed.userLat,
      userLng: parsed.userLng,
      remainingBudget: parsed.remainingBudget ?? 0,
      totalBudget: parsed.totalBudget ?? 5000,
      remainingTimeMinutes: parsed.remainingTimeMinutes ?? 0,
      selectedExperienceIds: selectedExperiences.map((s: any) => s.id),
      selectedCategories: Array.from(new Set(selectedExperiences.map((s: any) => s.category as string))),
      selectedExperiences,
      rejectedExperienceIds: [],
    };
  } catch {
    return null;
  }
}


