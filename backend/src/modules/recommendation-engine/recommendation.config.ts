export interface RecommendationWeights {
  w1_locationMatch: number;     // weight for proximity
  w2_intentMatch: number;       // weight for category / user intent match
  w3_budgetFit: number;         // weight for budget band compatibility
  w4_timeAvailability: number;  // weight for open/available slot
  w5_rating: number;            // weight for average user ratings
  w6_authenticity: number;      // weight for local authenticity rating
  w7_distancePenalty: number;   // penalty weight per kilometer distance
  // ── Session-aware factors (addendum Section 3) ──────────────────────────
  // These are only active when sessionContext is provided to calculateScore().
  // When sessionContext is undefined all three contribute exactly 0.0 to the
  // final score, so the single-shot recommendation path is provably unaffected.
  w8_routeContinuity: number;   // reward for continuing in a consistent direction
  w9_diversity: number;         // soft penalty for category over-repetition
  w10_rejectionPenalty: number; // penalty for rejected category/experience
}

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  w1_locationMatch: 0.25,
  w2_intentMatch: 0.25,
  w3_budgetFit: 0.15,
  w4_timeAvailability: 0.10,
  w5_rating: 0.15,
  w6_authenticity: 0.10,
  w7_distancePenalty: 0.08,
  // w8/w9/w10: session weights.
  // w10 = 0.25 justified against seed data: with 7 experiences across 4 categories, a
  // rejected FOOD category drops effective intentMatch from 0.50 (baseline) to 0.25.
  // That's enough to rank a fresh CULTURE/WORKSHOPS candidate ahead without a hard block.
  w8_routeContinuity: 0.12,
  w9_diversity: 0.10,
  w10_rejectionPenalty: 0.25,
};
