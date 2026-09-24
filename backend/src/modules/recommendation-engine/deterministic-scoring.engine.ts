import {
  RecommendationWeights,
  DEFAULT_RECOMMENDATION_WEIGHTS,
} from './recommendation.config';
import {
  Category,
  BudgetBand,
  CandidateScoreBreakdown,
  RecommendationCandidateDto,
  SessionScoringContext,
  WeatherTag,
} from '@experience-platform/shared';

export interface RawCandidateInput {
  id: string;
  title: string;
  category: Category;
  city: string;
  distanceKm: number;
  priceMin: number;
  priceMax: number;
  budgetBand: BudgetBand;
  ratingAverage: number;
  reviewCount: number;
  authenticityRating: number;
  accessibilityTags: string[];
  mediaUrls: string[];
  availabilityRules: Array<{
    daysOfWeek: number[];
    openTime: string;
    closeTime: string;
  }>;
  // Distance from current session location (injected by service for session calls)
  distanceFromCurrentKm?: number;
  candidateLat?: number;
  candidateLng?: number;
  weatherTag?: WeatherTag;
}

export interface FilterCriteria {
  maxDistanceKm: number;
  categories?: Category[];
  budgetBand?: BudgetBand;
  requiredAccessibilityTags?: string[];
  targetDayOfWeek?: number; // 0-6
  targetTimeMinutes?: number; // minutes from midnight (e.g. 14:30 = 870)
}

// Re-export so spec and service can import from the engine module directly.
export type { SessionScoringContext };

// ─── Haversine helper (used by route-continuity score) ─────────────────────
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculates the compass bearing (0–360°) from point A to point B.
 */
export function computeBearing(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const dLng = toRad(toLng - fromLng);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Angular difference between two bearings (0–180°).
 */
export function bearingDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export class DeterministicScoringEngine {
  /**
   * Layer 1: Pure Hard Filtering (deterministic, zero LLM)
   */
  static applyHardFilters(
    candidates: RawCandidateInput[],
    criteria: FilterCriteria,
  ): RawCandidateInput[] {
    return candidates.filter((candidate) => {
      // 1. Distance ceiling
      if (candidate.distanceKm > criteria.maxDistanceKm) {
        return false;
      }

      // 2. Category match (if categories specified)
      if (
        criteria.categories &&
        criteria.categories.length > 0 &&
        !criteria.categories.includes(candidate.category)
      ) {
        return false;
      }

      // 3. Accessibility tags match (if required)
      if (
        criteria.requiredAccessibilityTags &&
        criteria.requiredAccessibilityTags.length > 0
      ) {
        const hasAllTags = criteria.requiredAccessibilityTags.every((tag) =>
          candidate.accessibilityTags.includes(tag),
        );
        if (!hasAllTags) return false;
      }

      // 4. Availability check (if day/time specified)
      if (
        criteria.targetDayOfWeek !== undefined &&
        criteria.targetTimeMinutes !== undefined &&
        candidate.availabilityRules &&
        candidate.availabilityRules.length > 0
      ) {
        const isOpen = candidate.availabilityRules.some((rule) => {
          if (!rule.daysOfWeek.includes(criteria.targetDayOfWeek!)) return false;
          const [openH, openM] = rule.openTime.split(':').map(Number);
          const [closeH, closeM] = rule.closeTime.split(':').map(Number);
          const openMins = openH * 60 + openM;
          const closeMins = closeH * 60 + closeM;
          return criteria.targetTimeMinutes! >= openMins && criteria.targetTimeMinutes! <= closeMins;
        });
        if (!isOpen) return false;
      }

      return true;
    });
  }

  // ─── Session-aware pure scoring functions ─────────────────────────────────
  // Each is a pure static function with no side effects, independently testable.
  // The session context is NEVER persisted inside these functions.

  /**
   * Route Continuity Score (addendum Section 3.1).
   *
   * Rewards candidates that continue in roughly the same geographic direction
   * as the last 1–2 moves. Prevents GPS zig-zagging (e.g. Colaba → Bandra → Colaba).
   *
   * Algorithm:
   *  1. Compute bearing from previous stop → current stop (the "travel direction so far").
   *  2. Compute bearing from current stop → candidate.
   *  3. Score = 1 - (angularDiff / 180), clamped to [0, 1].
   *     → Perfect alignment (same direction) → 1.0
   *     → Exact backtrack (180° reversal)    → 0.0
   *     → No prior bearing available          → 0.5 (neutral, no reward/penalty)
   *
   * Returns 0.0 when candidateLat/Lng are missing (service must populate them).
   */
  static computeRouteContinuityScore(
    candidate: RawCandidateInput,
    session: SessionScoringContext,
  ): number {
    if (
      candidate.candidateLat === undefined ||
      candidate.candidateLng === undefined
    ) {
      return 0.0;
    }

    // No prior move — can't compute bearing consistency; return neutral.
    if (
      session.previousLocationLat === undefined ||
      session.previousLocationLng === undefined
    ) {
      return 0.5;
    }

    // Bearing of the last move: previous → current
    const travelBearing = computeBearing(
      session.previousLocationLat,
      session.previousLocationLng,
      session.currentLocationLat,
      session.currentLocationLng,
    );

    // Bearing toward this candidate: current → candidate
    const candidateBearing = computeBearing(
      session.currentLocationLat,
      session.currentLocationLng,
      candidate.candidateLat,
      candidate.candidateLng,
    );

    const diff = bearingDiff(travelBearing, candidateBearing);
    return Math.max(0, 1.0 - diff / 180);
  }

  /**
   * Diversity Score (addendum Section 3.2).
   *
   * Soft penalty when a candidate's category has already appeared 2+ times
   * in the session's selected stops. Allows food-focused trips while nudging
   * variety. Returns a score in [0, 1] to be multiplied by w9.
   *
   *  occurrences = 0 or 1 → score 1.0 (no penalty)
   *  occurrences = 2       → score 0.5 (mild soft penalty)
   *  occurrences ≥ 3       → score 0.2 (strong soft penalty, not a hard block)
   */
  static computeDiversityScore(
    candidate: RawCandidateInput,
    selectedCategories: Category[],
  ): number {
    const occurrences = selectedCategories.filter(
      (cat) => cat === candidate.category,
    ).length;

    if (occurrences <= 1) return 1.0;
    if (occurrences === 2) return 0.5;
    return 0.2;
  }

  /**
   * Rejection Penalty (addendum Section 3.3).
   *
   * Session-scoped only. Returns a penalty score (positive value, subtracted
   * in the final formula via w10). Categories/experiences the user has explicitly
   * rejected get a high penalty; un-rejected ones get 0.
   *
   * NOTE: This data is NEVER promoted to TravelerProfile without explicit consent.
   * See TODO(consent) comments in trip-session.service.ts.
   */
  static computeRejectionPenalty(
    candidate: RawCandidateInput,
    rejectedCategories: Category[],
    rejectedExperienceIds: string[],
  ): number {
    // Direct experience rejection: full penalty
    if (rejectedExperienceIds.includes(candidate.id)) {
      return 1.0;
    }
    // Category rejection: proportional penalty based on how many times this
    // category appears in the rejection list (same category rejected twice → stronger signal)
    const categoryRejections = rejectedCategories.filter(
      (cat) => cat === candidate.category,
    ).length;

    if (categoryRejections === 0) return 0.0;
    if (categoryRejections === 1) return 0.5;
    return 0.8; // Repeated category rejection — strong penalty, still not a hard block
  }

  /**
   * Bayesian Smoothed Rating Score (0.0 to 1.0).
   * Incorporates user star ratings saved in the DB.
   * Places with high user stars rank ahead of lower/unrated places,
   * while Bayesian shrinkage prevents 1-review anomalies from dominating.
   */
  static computeRatingScore(ratingAverage?: number, reviewCount?: number): number {
    const priorMean = 3.5;
    const priorWeight = 3;
    const count = reviewCount || 0;
    const avg = (ratingAverage !== undefined && ratingAverage > 0) ? ratingAverage : priorMean;
    const bayesianAvg = (count * avg + priorWeight * priorMean) / (count + priorWeight);
    return Math.min(1.0, Math.max(0.0, bayesianAvg / 5.0));
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 2: Pure Weighted Scoring (deterministic, configurable weights).
   *
   * sessionContext is optional. When undefined, w8/w9/w10 contribute exactly
   * 0.0 to rawScore, making single-shot behavior provably identical to the
   * pre-addendum implementation. Existing tests pass unchanged.
   */
  static calculateScore(
    candidate: RawCandidateInput,
    context: {
      userCategories?: Category[];
      userBudgetBand?: BudgetBand;
      maxSearchRadiusKm: number;
    },
    weights: RecommendationWeights = DEFAULT_RECOMMENDATION_WEIGHTS,
    sessionContext?: SessionScoringContext,
  ): CandidateScoreBreakdown {
    // Proximity score (1.0 = right here, 0.0 = edge of radius)
    const normalizedDistance = Math.min(candidate.distanceKm / (context.maxSearchRadiusKm || 20), 1.0);
    const locationMatch = Math.max(0, 1.0 - normalizedDistance);

    // Intent match (Category match & intent alignment)
    let intentMatch = 0.5; // baseline
    if (context.userCategories && context.userCategories.length > 0) {
      intentMatch = context.userCategories.includes(candidate.category) ? 1.0 : 0.2;
    }

    // Budget fit (exact match = 1.0, 1 step off = 0.6, 2 steps = 0.3)
    let budgetFit = 0.7;
    if (context.userBudgetBand) {
      const bands = [BudgetBand.BUDGET, BudgetBand.MODERATE, BudgetBand.PREMIUM, BudgetBand.LUXURY];
      const targetIdx = bands.indexOf(context.userBudgetBand);
      const candIdx = bands.indexOf(candidate.budgetBand);
      const diff = Math.abs(targetIdx - candIdx);
      budgetFit = diff === 0 ? 1.0 : diff === 1 ? 0.6 : 0.2;
    }

    // Time availability
    const timeAvailability = 1.0;

    // Rating score (normalized to 0-1, Bayesian smoothed from DB user reviews)
    const ratingScore = this.computeRatingScore(candidate.ratingAverage, candidate.reviewCount);

    // Authenticity score (0-1)
    const authenticityScore = Math.min(Math.max(candidate.authenticityRating || 0.8, 0), 1.0);

    // Distance penalty
    const distancePenalty = normalizedDistance * 0.5;

    // ── Session-aware factors (all 0.0 when sessionContext is undefined) ────
    let routeContinuityScore = 0.0;
    let diversityScore = 0.0;
    let rejectionPenalty = 0.0;

    if (sessionContext) {
      routeContinuityScore = this.computeRouteContinuityScore(candidate, sessionContext);
      diversityScore = this.computeDiversityScore(candidate, sessionContext.selectedCategories);
      rejectionPenalty = this.computeRejectionPenalty(
        candidate,
        sessionContext.rejectedCategories,
        sessionContext.rejectedExperienceIds,
      );
    }

    // Final weighted score calculation
    const rawScore =
      weights.w1_locationMatch * locationMatch +
      weights.w2_intentMatch * intentMatch +
      weights.w3_budgetFit * budgetFit +
      weights.w4_timeAvailability * timeAvailability +
      weights.w5_rating * ratingScore +
      weights.w6_authenticity * authenticityScore -
      weights.w7_distancePenalty * distancePenalty +
      weights.w8_routeContinuity * routeContinuityScore +
      weights.w9_diversity * diversityScore -
      weights.w10_rejectionPenalty * rejectionPenalty;

    const finalScore = Math.round(Math.max(0, Math.min(1.0, rawScore)) * 1000) / 1000;

    return {
      locationMatch: Math.round(locationMatch * 100) / 100,
      intentMatch: Math.round(intentMatch * 100) / 100,
      budgetFit: Math.round(budgetFit * 100) / 100,
      timeAvailability,
      ratingScore: Math.round(ratingScore * 100) / 100,
      authenticityScore: Math.round(authenticityScore * 100) / 100,
      distancePenalty: Math.round(distancePenalty * 100) / 100,
      routeContinuityScore: Math.round(routeContinuityScore * 100) / 100,
      diversityScore: Math.round(diversityScore * 100) / 100,
      rejectionPenalty: Math.round(rejectionPenalty * 100) / 100,
      finalScore,
    };
  }

  /**
   * Complete Layer 1 & 2 Execution: Filter, Score, and Sort Top-N Candidates
   */
  static rankCandidates(
    candidates: RawCandidateInput[],
    criteria: FilterCriteria & {
      userCategories?: Category[];
      userBudgetBand?: BudgetBand;
      limit?: number;
    },
    weights: RecommendationWeights = DEFAULT_RECOMMENDATION_WEIGHTS,
    sessionContext?: SessionScoringContext,
  ): RecommendationCandidateDto[] {
    const filtered = this.applyHardFilters(candidates, criteria);

    const scored = filtered.map((candidate) => {
      const scoreBreakdown = this.calculateScore(
        candidate,
        {
          userCategories: criteria.userCategories,
          userBudgetBand: criteria.userBudgetBand,
          maxSearchRadiusKm: criteria.maxDistanceKm,
        },
        weights,
        sessionContext,
      );

      return {
        id: candidate.id,
        title: candidate.title,
        category: candidate.category,
        city: candidate.city,
        distanceKm: candidate.distanceKm,
        priceMin: candidate.priceMin,
        priceMax: candidate.priceMax,
        budgetBand: candidate.budgetBand,
        ratingAverage: candidate.ratingAverage,
        reviewCount: candidate.reviewCount,
        authenticityRating: candidate.authenticityRating,
        accessibilityTags: candidate.accessibilityTags,
        mediaUrls: candidate.mediaUrls,
        candidateLat: candidate.candidateLat,
        candidateLng: candidate.candidateLng,
        scoreBreakdown,
      };
    });

    // Pure deterministic descending sort by finalScore
    scored.sort((a, b) => b.scoreBreakdown.finalScore - a.scoreBreakdown.finalScore);

    const limit = criteria.limit || 10;
    return scored.slice(0, limit);
  }
}
