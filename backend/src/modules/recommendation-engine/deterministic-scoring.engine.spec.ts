import { DeterministicScoringEngine, RawCandidateInput, computeBearing, bearingDiff } from './deterministic-scoring.engine';
import { Category, BudgetBand, SessionScoringContext } from '@experience-platform/shared';
import { DEFAULT_RECOMMENDATION_WEIGHTS } from './recommendation.config';

describe('DeterministicScoringEngine (Pure Unit Tests)', () => {
  const mockCandidates: RawCandidateInput[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Heritage Pol Food Walk',
      category: Category.FOOD,
      city: 'Ahmedabad',
      distanceKm: 2.5,
      priceMin: 400,
      priceMax: 600,
      budgetBand: BudgetBand.MODERATE,
      ratingAverage: 4.8,
      reviewCount: 42,
      authenticityRating: 0.95,
      accessibilityTags: ['WHEELCHAIR_ACCESSIBLE'],
      mediaUrls: ['https://example.com/food.jpg'],
      availabilityRules: [
        { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], openTime: '08:00', closeTime: '22:00' },
      ],
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Midnight Astronomy Adventure',
      category: Category.ADVENTURE,
      city: 'Ahmedabad',
      distanceKm: 18.0,
      priceMin: 2500,
      priceMax: 3500,
      budgetBand: BudgetBand.PREMIUM,
      ratingAverage: 4.5,
      reviewCount: 15,
      authenticityRating: 0.85,
      accessibilityTags: [],
      mediaUrls: ['https://example.com/adventure.jpg'],
      availabilityRules: [
        { daysOfWeek: [5, 6], openTime: '20:00', closeTime: '23:59' },
      ],
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Block Printing Workshop',
      category: Category.WORKSHOPS,
      city: 'Ahmedabad',
      distanceKm: 4.0,
      priceMin: 800,
      priceMax: 1200,
      budgetBand: BudgetBand.MODERATE,
      ratingAverage: 4.9,
      reviewCount: 60,
      authenticityRating: 0.98,
      accessibilityTags: ['WHEELCHAIR_ACCESSIBLE', 'INDOOR'],
      mediaUrls: ['https://example.com/workshop.jpg'],
      availabilityRules: [
        { daysOfWeek: [1, 2, 3, 4, 5], openTime: '10:00', closeTime: '18:00' },
      ],
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Distant Oasis',
      category: Category.HIDDEN_GEMS,
      city: 'Outskirts',
      distanceKm: 45.0, // beyond 20km radius
      priceMin: 300,
      priceMax: 500,
      budgetBand: BudgetBand.BUDGET,
      ratingAverage: 4.2,
      reviewCount: 5,
      authenticityRating: 0.7,
      accessibilityTags: [],
      mediaUrls: ['https://example.com/oasis.jpg'],
      availabilityRules: [
        { daysOfWeek: [0, 6], openTime: '06:00', closeTime: '18:00' },
      ],
    },
  ];

  // ─── EXISTING TESTS (untouched) ──────────────────────────────────────────

  describe('Layer 1: Hard Filters', () => {
    it('should exclude candidates exceeding maximum distance radius', () => {
      const filtered = DeterministicScoringEngine.applyHardFilters(mockCandidates, {
        maxDistanceKm: 20,
      });
      expect(filtered.map((c) => c.id)).not.toContain('44444444-4444-4444-4444-444444444444');
      expect(filtered.length).toBe(3);
    });

    it('should filter strictly by requested categories', () => {
      const filtered = DeterministicScoringEngine.applyHardFilters(mockCandidates, {
        maxDistanceKm: 25,
        categories: [Category.FOOD, Category.WORKSHOPS],
      });
      expect(filtered.length).toBe(2);
      expect(filtered.map((c) => c.category)).toEqual([Category.FOOD, Category.WORKSHOPS]);
    });

    it('should filter by required accessibility tags', () => {
      const filtered = DeterministicScoringEngine.applyHardFilters(mockCandidates, {
        maxDistanceKm: 25,
        requiredAccessibilityTags: ['WHEELCHAIR_ACCESSIBLE', 'INDOOR'],
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Block Printing Workshop');
    });

    it('should filter by opening hours on given day and time', () => {
      // Monday (day 1) at 12:00 (720 minutes)
      const filteredMondayNoon = DeterministicScoringEngine.applyHardFilters(mockCandidates, {
        maxDistanceKm: 25,
        targetDayOfWeek: 1,
        targetTimeMinutes: 720,
      });
      // Food Walk (all week 8-22) and Workshop (Mon-Fri 10-18) should pass, Midnight Adventure should fail
      expect(filteredMondayNoon.length).toBe(2);
      expect(filteredMondayNoon.map((c) => c.id)).toEqual([
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
      ]);
    });
  });

  describe('Layer 2: Weighted Scoring & Ranking', () => {
    it('should rank closer and higher rated experiences higher', () => {
      const ranked = DeterministicScoringEngine.rankCandidates(
        mockCandidates,
        {
          maxDistanceKm: 20,
          userCategories: [Category.FOOD],
          userBudgetBand: BudgetBand.MODERATE,
        },
        DEFAULT_RECOMMENDATION_WEIGHTS,
      );

      expect(ranked.length).toBe(3);
      // Food walk is closest (2.5km), matches category FOOD, and matches budget MODERATE
      expect(ranked[0].id).toBe('11111111-1111-1111-1111-111111111111');
      expect(ranked[0].scoreBreakdown.finalScore).toBeGreaterThan(ranked[1].scoreBreakdown.finalScore);
      expect(ranked[0].scoreBreakdown.intentMatch).toBe(1.0);
    });

    it('should calculate deterministic scores with no NaN or undefined fields', () => {
      const score = DeterministicScoringEngine.calculateScore(
        mockCandidates[0],
        {
          userCategories: [Category.FOOD],
          userBudgetBand: BudgetBand.MODERATE,
          maxSearchRadiusKm: 20,
        },
        DEFAULT_RECOMMENDATION_WEIGHTS,
      );

      expect(score.finalScore).toBeGreaterThan(0);
      expect(score.finalScore).toBeLessThanOrEqual(1.0);
      expect(score.locationMatch).toBeGreaterThan(0.8);
      expect(score.budgetFit).toBe(1.0);
    });
  });

  // ─── NEW TESTS: Session-aware scoring factors ────────────────────────────
  // These are appended below. Existing tests above are NOT modified.

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: bearing geometry — concrete coords to verify the math
  // ─────────────────────────────────────────────────────────────────────────
  describe('Bearing utilities', () => {
    it('computeBearing: Colaba → Bandra is north-north-east (~5°)', () => {
      // Colaba: 18.9067 N, 72.8154 E  →  Bandra: 19.0596 N, 72.8295 E
      // Δlat = +0.1529, Δlng = +0.0141 → Heading mostly North, slight East (~5°)
      const bearing = computeBearing(18.9067, 72.8154, 19.0596, 72.8295);
      expect(bearing).toBeGreaterThan(0);
      expect(bearing).toBeLessThan(15);
    });

    it('computeBearing: Bandra → Colaba is south-south-west (~185°)', () => {
      // Bandra: 19.0596 N, 72.8295 E  →  Colaba: 18.9067 N, 72.8154 E
      // Heading mostly South, slight West (~185°)
      const bearing = computeBearing(19.0596, 72.8295, 18.9067, 72.8154);
      expect(bearing).toBeGreaterThan(180);
      expect(bearing).toBeLessThan(195);
    });

    it('bearingDiff: opposite bearings should return ~180', () => {
      expect(bearingDiff(0, 180)).toBe(180);
      expect(bearingDiff(90, 270)).toBe(180);
    });

    it('bearingDiff: same bearing should return 0', () => {
      expect(bearingDiff(45, 45)).toBe(0);
    });

    it('bearingDiff: wraps correctly across 0/360 boundary', () => {
      // 350° and 10° are 20° apart
      expect(bearingDiff(350, 10)).toBe(20);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeRouteContinuityScore — concrete Mumbai coordinate test cases
  // ─────────────────────────────────────────────────────────────────────────
  describe('computeRouteContinuityScore', () => {
    /**
     * Concrete test: the "zig-zag prevention" scenario described in addendum Section 3.1.
     *
     * Trip path so far:  Gateway of India → Sassoon Dock (moving south, ~180°)
     * Candidate A: Colaba Market       (south of Sassoon Dock — continues south)
     * Candidate B: CST / Bori Bunder   (north of Sassoon Dock — backtracks)
     *
     * Expectation: Candidate A (continues south) scores higher than Candidate B (backtracks).
     *
     * Real coordinates:
     *   Gateway of India:  18.9220, 72.8347
     *   Sassoon Dock:      18.9137, 72.8258  (current location after stop 1)
     *   Colaba Market:     18.9082, 72.8179  (further south — good continuity)
     *   CST Station:       18.9400, 72.8356  (north — backtrack)
     */
    it('should score a southward candidate higher than a northward backtrack (Mumbai corridor)', () => {
      const gatewayLat = 18.9220;
      const gatewayLng = 72.8347;
      const sassoonLat = 18.9137;
      const sassoonLng = 72.8258;

      const session: SessionScoringContext = {
        currentLocationLat: sassoonLat,
        currentLocationLng: sassoonLng,
        previousLocationLat: gatewayLat,
        previousLocationLng: gatewayLng,
        selectedCategories: [Category.CULTURE],
        rejectedCategories: [],
        rejectedExperienceIds: [],
      };

      // Candidate A: Colaba Market (continues southward)
      const colabaMarket: RawCandidateInput = {
        ...mockCandidates[0],
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        title: 'Colaba Market',
        candidateLat: 18.9082,
        candidateLng: 72.8179,
      };

      // Candidate B: CST Station (backtracks northward)
      const cstStation: RawCandidateInput = {
        ...mockCandidates[0],
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        title: 'CST Station',
        candidateLat: 18.9400,
        candidateLng: 72.8356,
      };

      const scoreA = DeterministicScoringEngine.computeRouteContinuityScore(colabaMarket, session);
      const scoreB = DeterministicScoringEngine.computeRouteContinuityScore(cstStation, session);

      expect(scoreA).toBeGreaterThan(scoreB);
      expect(scoreA).toBeGreaterThan(0.5); // continuing south → good score
      expect(scoreB).toBeLessThan(0.5);    // backtracking north → penalised
    });

    it('should return 0.5 (neutral) when no previous location is known (first stop)', () => {
      const sessionFirstStop: SessionScoringContext = {
        currentLocationLat: 18.9220,
        currentLocationLng: 72.8347,
        // No previous location
        selectedCategories: [],
        rejectedCategories: [],
        rejectedExperienceIds: [],
      };
      const score = DeterministicScoringEngine.computeRouteContinuityScore(
        { ...mockCandidates[0], candidateLat: 18.9137, candidateLng: 72.8258 },
        sessionFirstStop,
      );
      expect(score).toBe(0.5);
    });

    it('should return 0.0 when candidate has no lat/lng populated', () => {
      const session: SessionScoringContext = {
        currentLocationLat: 18.9137,
        currentLocationLng: 72.8258,
        previousLocationLat: 18.9220,
        previousLocationLng: 72.8347,
        selectedCategories: [],
        rejectedCategories: [],
        rejectedExperienceIds: [],
      };
      const score = DeterministicScoringEngine.computeRouteContinuityScore(
        mockCandidates[0], // no candidateLat/Lng
        session,
      );
      expect(score).toBe(0.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeDiversityScore
  // ─────────────────────────────────────────────────────────────────────────
  describe('computeDiversityScore', () => {
    it('should return 1.0 when category has not been selected yet', () => {
      const score = DeterministicScoringEngine.computeDiversityScore(
        mockCandidates[0], // FOOD
        [Category.CULTURE, Category.WORKSHOPS],
      );
      expect(score).toBe(1.0);
    });

    it('should return 1.0 when category has been selected only once', () => {
      const score = DeterministicScoringEngine.computeDiversityScore(
        mockCandidates[0], // FOOD
        [Category.FOOD, Category.CULTURE],
      );
      expect(score).toBe(1.0);
    });

    it('should return 0.5 when category has been selected twice (mild soft penalty)', () => {
      const score = DeterministicScoringEngine.computeDiversityScore(
        mockCandidates[0], // FOOD
        [Category.FOOD, Category.FOOD, Category.CULTURE],
      );
      expect(score).toBe(0.5);
    });

    it('should return 0.2 when category appears 3+ times (strong soft penalty)', () => {
      const score = DeterministicScoringEngine.computeDiversityScore(
        mockCandidates[0], // FOOD
        [Category.FOOD, Category.FOOD, Category.FOOD, Category.CULTURE],
      );
      expect(score).toBe(0.2);
    });

    it('should not penalise other categories even if one category is heavily repeated', () => {
      const workshops = DeterministicScoringEngine.computeDiversityScore(
        mockCandidates[2], // WORKSHOPS
        [Category.FOOD, Category.FOOD, Category.FOOD],
      );
      expect(workshops).toBe(1.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeRejectionPenalty
  // ─────────────────────────────────────────────────────────────────────────
  describe('computeRejectionPenalty', () => {
    it('should return 0.0 for non-rejected experience with non-rejected category', () => {
      const penalty = DeterministicScoringEngine.computeRejectionPenalty(
        mockCandidates[0], // FOOD
        [],
        [],
      );
      expect(penalty).toBe(0.0);
    });

    it('should return 1.0 for a directly rejected experience ID', () => {
      const penalty = DeterministicScoringEngine.computeRejectionPenalty(
        mockCandidates[0],
        [],
        ['11111111-1111-1111-1111-111111111111'],
      );
      expect(penalty).toBe(1.0);
    });

    it('should return 0.5 for a candidate whose category was rejected once', () => {
      const penalty = DeterministicScoringEngine.computeRejectionPenalty(
        mockCandidates[0], // FOOD
        [Category.FOOD],
        [],
      );
      expect(penalty).toBe(0.5);
    });

    it('should return 0.8 for a candidate whose category was rejected twice', () => {
      const penalty = DeterministicScoringEngine.computeRejectionPenalty(
        mockCandidates[0], // FOOD
        [Category.FOOD, Category.FOOD],
        [],
      );
      expect(penalty).toBe(0.8);
    });

    it('should not penalise a different category from the rejected one', () => {
      const penalty = DeterministicScoringEngine.computeRejectionPenalty(
        mockCandidates[2], // WORKSHOPS — not rejected
        [Category.FOOD],   // only FOOD rejected
        [],
      );
      expect(penalty).toBe(0.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // calculateScore — session context integration
  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateScore — session context gating', () => {
    const baseContext = {
      userCategories: [Category.FOOD],
      userBudgetBand: BudgetBand.MODERATE,
      maxSearchRadiusKm: 20,
    };

    it('should produce identical finalScore without sessionContext (single-shot path unchanged)', () => {
      const scoreWithout = DeterministicScoringEngine.calculateScore(
        mockCandidates[0],
        baseContext,
        DEFAULT_RECOMMENDATION_WEIGHTS,
        // No sessionContext
      );
      // Snapshot the exact value — proves the formula is unchanged
      expect(scoreWithout.finalScore).toBeGreaterThan(0.6);
      expect(scoreWithout.routeContinuityScore).toBe(0);
      expect(scoreWithout.diversityScore).toBe(0);
      expect(scoreWithout.rejectionPenalty).toBe(0);
    });

    it('should lower finalScore when category is rejected (session context active)', () => {
      const scoreBase = DeterministicScoringEngine.calculateScore(
        mockCandidates[0], // FOOD
        baseContext,
        DEFAULT_RECOMMENDATION_WEIGHTS,
      );
      const sessionCtx: SessionScoringContext = {
        currentLocationLat: 23.0225,
        currentLocationLng: 72.5714,
        selectedCategories: [],
        rejectedCategories: [Category.FOOD], // FOOD rejected
        rejectedExperienceIds: [],
      };
      const scoreWithRejection = DeterministicScoringEngine.calculateScore(
        mockCandidates[0],
        baseContext,
        DEFAULT_RECOMMENDATION_WEIGHTS,
        sessionCtx,
      );

      expect(scoreWithRejection.finalScore).toBeLessThan(scoreBase.finalScore);
      expect(scoreWithRejection.rejectionPenalty).toBe(0.5);
    });

    it('should lower finalScore when category is over-represented in session selections', () => {
      const sessionCtxFresh: SessionScoringContext = {
        currentLocationLat: 23.0225,
        currentLocationLng: 72.5714,
        selectedCategories: [], // 0 selections
        rejectedCategories: [],
        rejectedExperienceIds: [],
      };
      const sessionCtxRepeated: SessionScoringContext = {
        currentLocationLat: 23.0225,
        currentLocationLng: 72.5714,
        selectedCategories: [Category.WORKSHOPS, Category.WORKSHOPS], // WORKSHOPS 2x already
        rejectedCategories: [],
        rejectedExperienceIds: [],
      };
      const workshopContext = {
        userCategories: [Category.WORKSHOPS],
        userBudgetBand: BudgetBand.MODERATE,
        maxSearchRadiusKm: 20,
      };
      const scoreFresh = DeterministicScoringEngine.calculateScore(
        mockCandidates[2], // WORKSHOPS
        workshopContext,
        DEFAULT_RECOMMENDATION_WEIGHTS,
        sessionCtxFresh,
      );
      const scoreRepeated = DeterministicScoringEngine.calculateScore(
        mockCandidates[2],
        workshopContext,
        DEFAULT_RECOMMENDATION_WEIGHTS,
        sessionCtxRepeated,
      );
      expect(scoreRepeated.finalScore).toBeLessThan(scoreFresh.finalScore);
      expect(scoreRepeated.diversityScore).toBe(0.5);
      expect(scoreFresh.diversityScore).toBe(1.0);
    });

    it('existing single-shot rankCandidates produces same results without sessionContext', () => {
      const ranked = DeterministicScoringEngine.rankCandidates(
        mockCandidates,
        { maxDistanceKm: 20, userCategories: [Category.FOOD], userBudgetBand: BudgetBand.MODERATE },
        DEFAULT_RECOMMENDATION_WEIGHTS,
        // No sessionContext
      );
      expect(ranked[0].id).toBe('11111111-1111-1111-1111-111111111111');
      expect(ranked[0].scoreBreakdown.rejectionPenalty).toBe(0);
      expect(ranked[0].scoreBreakdown.routeContinuityScore).toBe(0);
    });
  });

  // ─── NEW TESTS: User Star Ratings & Location Hierarchy ───────────────────
  describe('User Star Ratings & Location Hierarchy', () => {
    it('computeRatingScore: Bayesian smoothing scales correctly with review counts', () => {
      // 0 reviews falls back to prior 3.5 / 5.0 = 0.70
      expect(DeterministicScoringEngine.computeRatingScore(0, 0)).toBeCloseTo(0.70, 2);
      expect(DeterministicScoringEngine.computeRatingScore(undefined, 0)).toBeCloseTo(0.70, 2);

      // Place with high stars (5.0) and high review count approaches 1.0
      const highRatedScore = DeterministicScoringEngine.computeRatingScore(5.0, 30);
      expect(highRatedScore).toBeGreaterThan(0.95);

      // Place with low stars (1.5) and high review count is pulled down
      const lowRatedScore = DeterministicScoringEngine.computeRatingScore(1.5, 20);
      expect(lowRatedScore).toBeLessThan(0.40);

      // Single 5.0 review is smoothed: (1 * 5 + 3 * 3.5) / 4 / 5 = 15.5 / 20 = 0.775
      const singleReviewScore = DeterministicScoringEngine.computeRatingScore(5.0, 1);
      expect(singleReviewScore).toBeCloseTo(0.775, 2);
    });

    it('ranks place with higher user stars first when distance and category match', () => {
      const candidateHighStars: RawCandidateInput = {
        ...mockCandidates[0],
        id: 'aaaa-high-stars',
        ratingAverage: 4.9,
        reviewCount: 25,
        distanceKm: 3.0,
      };
      const candidateLowStars: RawCandidateInput = {
        ...mockCandidates[0],
        id: 'bbbb-low-stars',
        ratingAverage: 2.5,
        reviewCount: 25,
        distanceKm: 3.0,
      };

      const ranked = DeterministicScoringEngine.rankCandidates(
        [candidateLowStars, candidateHighStars],
        { maxDistanceKm: 20, userCategories: [Category.FOOD] },
        DEFAULT_RECOMMENDATION_WEIGHTS,
      );

      expect(ranked[0].id).toBe('aaaa-high-stars');
      expect(ranked[0].scoreBreakdown.finalScore).toBeGreaterThan(ranked[1].scoreBreakdown.finalScore);
      expect(ranked[0].scoreBreakdown.ratingScore).toBeGreaterThan(ranked[1].scoreBreakdown.ratingScore);
    });

    it('location dominance: nearby 4.0 star place ranks ahead of far 5.0 star place', () => {
      const nearbySpot: RawCandidateInput = {
        ...mockCandidates[0],
        id: 'nearby-4-star',
        ratingAverage: 4.0,
        reviewCount: 15,
        distanceKm: 1.5,
      };
      const distantSpot: RawCandidateInput = {
        ...mockCandidates[0],
        id: 'distant-5-star',
        ratingAverage: 5.0,
        reviewCount: 50,
        distanceKm: 18.0,
      };

      const ranked = DeterministicScoringEngine.rankCandidates(
        [distantSpot, nearbySpot],
        { maxDistanceKm: 20, userCategories: [Category.FOOD] },
        DEFAULT_RECOMMENDATION_WEIGHTS,
      );

      // Proximity & distance penalty keep the nearby spot first
      expect(ranked[0].id).toBe('nearby-4-star');
      expect(ranked[0].scoreBreakdown.finalScore).toBeGreaterThan(ranked[1].scoreBreakdown.finalScore);
      expect(ranked[0].scoreBreakdown.locationMatch).toBeGreaterThan(ranked[1].scoreBreakdown.locationMatch);
    });
  });
});
