import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiReasoningService } from '../ai-reasoning/ai-reasoning.service';
import { DeterministicScoringEngine } from '../recommendation-engine/deterministic-scoring.engine';
import { DEFAULT_RECOMMENDATION_WEIGHTS } from '../recommendation-engine/recommendation.config';
import { WeatherService } from './weather.service';
import {
  evaluateStopConditions,
  estimateTravelTimeMinutes,
} from './trip-session.utils';
import {
  CreateTripSessionDto,
  AddSelectionDto,
  RejectCandidateDto,
  SessionScoringContext,
  WeatherTag,
  TripSessionStatus,
} from '@experience-platform/shared';
import { coarsenLocation } from '../../common/utils/location-privacy.util';

@Injectable()
export class TripSessionService {
  private readonly logger = new Logger(TripSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiReasoning: AiReasoningService,
    private readonly weather: WeatherService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  /**
   * Creates a new ACTIVE trip session.
   * Enforces a one-active-session-per-user rule (ConflictException if violated).
   */
  async createSession(userId: string, dto: CreateTripSessionDto) {
    // One ACTIVE session per user at a time
    const existingActive = await this.prisma.tripSession.findFirst({
      where: { userId, status: TripSessionStatus.ACTIVE },
    });
    if (existingActive) {
      throw new ConflictException(
        'You already have an active itinerary session. Complete or abandon it before starting a new one.',
      );
    }

    return this.prisma.$queryRawUnsafe<{ id: string }[]>(
      `
      INSERT INTO trip_sessions (
        id, user_id, status,
        start_location, current_location,
        start_time, remaining_time_minutes,
        total_budget, remaining_budget,
        group_size, accessibility_requirements,
        interests, last_activity_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, 'ACTIVE',
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        NOW(), $4, $5, $5, $6, $7::text[], $8::"Category"[], NOW(), NOW()
      ) RETURNING id;
      `,
      userId,
      dto.longitude,
      dto.latitude,
      dto.totalTimeMinutes,
      dto.totalBudget,
      dto.groupSize,
      dto.accessibilityRequirements,
      dto.interests,
    ).then((rows) => rows[0]);
  }

  // ─── Read ────────────────────────────────────────────────────────────────

  async getActiveSession(userId: string) {
    const session = await this.prisma.tripSession.findFirst({
      where: { userId, status: TripSessionStatus.ACTIVE },
    });
    if (!session) throw new NotFoundException('No active trip session found.');
    return session;
  }

  /**
   * Get trip history for user, fetching experience titles and cities for each session.
   */
  async getTripHistory(userId: string) {
    const sessions = await this.prisma.tripSession.findMany({
      where: {
        userId,
        status: { in: [TripSessionStatus.COMPLETED, TripSessionStatus.ACTIVE] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    // Resolve experiences for all sessions in parallel
    const enhancedSessions = await Promise.all(
      sessions.map(async (s) => {
        let experiences: any[] = [];
        if (s.selectedExperienceIds && s.selectedExperienceIds.length > 0) {
          experiences = await this.prisma.experience.findMany({
            where: { id: { in: s.selectedExperienceIds } },
            select: { id: true, title: true, city: true, category: true, mediaUrls: true },
          });
        }
        return {
          ...s,
          stopCount: s.selectedExperienceIds ? s.selectedExperienceIds.length : 0,
          city: experiences[0]?.city || 'Local Journey',
          firstExperienceImage: experiences[0]?.mediaUrls[0] || null,
          experienceTitles: experiences.map((e) => e.title),
        };
      }),
    );

    return {
      active: enhancedSessions.filter((s) => s.status === TripSessionStatus.ACTIVE),
      completed: enhancedSessions.filter((s) => s.status === TripSessionStatus.COMPLETED),
      total: enhancedSessions.length,
    };
  }

  async getSessionById(sessionId: string, userId: string) {
    const session = await this.prisma.tripSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Trip session not found.');
    this.assertOwnership(session.userId, userId);

    let selectedExperiences: any[] = [];
    if (session.selectedExperienceIds && session.selectedExperienceIds.length > 0) {
      selectedExperiences = await this.prisma.experience.findMany({
        where: { id: { in: session.selectedExperienceIds } },
        select: {
          id: true,
          title: true,
          category: true,
          city: true,
          priceMin: true,
          priceMax: true,
          ratingAverage: true,
          authenticityRating: true,
          mediaUrls: true,
          durationMinutes: true,
          latitude: true,
          longitude: true,
        },
      });

      // Preserve the user's selection order
      const expMap = new Map(selectedExperiences.map((e) => [e.id, e]));
      selectedExperiences = session.selectedExperienceIds
        .map((id) => expMap.get(id))
        .filter(Boolean);
    }

    return {
      ...session,
      selectedExperiences,
    };
  }

  // ─── Recommendations ─────────────────────────────────────────────────────

  /**
   * Generates the next set of recommendations for the session.
   *
   * Flow:
   *  1. Load session + assert ownership
   *  2. Fetch weather for current location
   *  3. Query candidate experiences from DB within budget/radius
   *  4. Apply Layer 1 hard filters (including weather-tag filter when adverse)
   *  5. Evaluate stop conditions
   *  6. Apply Layer 2 session-aware scoring (w8/w9/w10)
   *  7. Call AI reasoning for step explanations (+ wrap-up/weather prompts if flagged)
   *  8. Log to RecommendationLog with coarsened location (never raw GPS)
   *  9. Return top-N candidates with explanations and session state
   */
  async getNextRecommendations(sessionId: string, userId: string) {
    const session = await this.prisma.tripSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Trip session not found.');
    this.assertOwnership(session.userId, userId);

    // Extract current lat/lng from PostGIS geography
    const [currentLat, currentLng] = await this.extractLatLng(sessionId, 'current_location');

    // 1. Fetch weather (fire-and-forget on failure — safeFallback inside service)
    const weatherCondition = await this.weather.getCurrentConditions(currentLat, currentLng);
    const isAdverseWeather = this.weather.isAdverse(weatherCondition);

    // 2. Query candidates within budget and approx radius from DB
    // Expanded to 50km to comfortably cover entire metropolitan regions (e.g., MMR/Mumbai, Ahmedabad metro)
    const radiusKm = 50;
    const rawCandidates = await this.fetchCandidatesNear(
      currentLat,
      currentLng,
      radiusKm,
      session.remainingBudget,
      session.rejectedExperienceIds as string[],
    );

    // 3. Apply Layer 1 hard filters + weather filtering
    const filtered = DeterministicScoringEngine.applyHardFilters(
      rawCandidates.map((c) => ({
        ...c,
        // Filter out outdoor/weather-dependent when weather is adverse
        ...(isAdverseWeather && c.weatherTag === WeatherTag.OUTDOOR
          ? { _weatherFiltered: true }
          : {}),
      })).filter((c) => {
        if (!isAdverseWeather) return true;
        return c.weatherTag !== WeatherTag.OUTDOOR;
      }),
      {
        maxDistanceKm: radiusKm,
        requiredAccessibilityTags: session.accessibilityRequirements as string[],
      },
    );

    // 4. Evaluate stop conditions
    const cheapestPrice = filtered.length > 0
      ? Math.min(...filtered.map((c) => c.priceMin))
      : Infinity;
    const stopResult = evaluateStopConditions(
      {
        remainingTimeMinutes: session.remainingTimeMinutes,
        remainingBudget: session.remainingBudget,
        status: session.status,
      },
      cheapestPrice,
      filtered.length,
      session.totalBudget,
    );

    // 5. Build session scoring context
    const [prevLat, prevLng] = session.selectedExperienceIds.length >= 2
      ? await this.extractLatLng(sessionId, 'start_location') // simplified: use start as prev
      : [undefined, undefined];

    const sessionCtx: SessionScoringContext = {
      currentLocationLat: currentLat,
      currentLocationLng: currentLng,
      previousLocationLat: prevLat,
      previousLocationLng: prevLng,
      selectedCategories: session.selectedCategories as any[],
      rejectedCategories: session.rejectedCategories as any[],
      rejectedExperienceIds: session.rejectedExperienceIds as string[],
    };

    // 6. Layer 2: session-aware scoring + weather soft-deprioritise
    const scored = DeterministicScoringEngine.rankCandidates(
      filtered.map((c) => ({
        ...c,
        // Soft-deprioritise weather-dependent when adverse (not a hard block)
        ...(isAdverseWeather && c.weatherTag === WeatherTag.WEATHER_DEPENDENT
          ? { ratingAverage: c.ratingAverage * 0.7 }
          : {}),
      })),
      {
        maxDistanceKm: radiusKm,
        userCategories: session.interests as any[],
        limit: 5,
      },
      DEFAULT_RECOMMENDATION_WEIGHTS,
      sessionCtx,
    );

    // 7. AI reasoning
    const aiPayload = {
      groupSize: session.groupSize,
      candidates: scored.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        city: c.city,
        distanceKm: c.distanceKm,
        priceMin: c.priceMin,
        priceMax: c.priceMax,
        ratingAverage: c.ratingAverage,
        authenticityRating: c.authenticityRating,
        accessibilityTags: c.accessibilityTags,
      })),
      sessionContext: {
        remainingTimeMinutes: session.remainingTimeMinutes,
        remainingBudget: session.remainingBudget,
        stopConditionNear: stopResult.wrapUpFlag,
        weatherAdverse: isAdverseWeather,
        selectedCount: session.selectedExperienceIds.length,
        lastStopTitle: undefined as string | undefined,
      },
    };
    const stepExplanations = scored.length > 0
      ? await this.aiReasoning.generateSessionStepExplanations(aiPayload)
      : [];

    let wrapUpPrompt = null;
    if (stopResult.wrapUpFlag && stopResult.wrapUpTriggerReason) {
      wrapUpPrompt = await this.aiReasoning.generateWrapUpPrompt(
        aiPayload,
        stopResult.wrapUpTriggerReason,
      );
    }

    let weatherAdaptPrompt = null;
    if (isAdverseWeather && scored.length > 0) {
      const weatherAffected = rawCandidates
        .filter((c) => c.weatherTag === WeatherTag.OUTDOOR || c.weatherTag === WeatherTag.WEATHER_DEPENDENT)
        .map((c) => c.id);
      if (weatherAffected.length > 0) {
        weatherAdaptPrompt = await this.aiReasoning.generateWeatherAdaptPrompt(
          weatherCondition.description,
          weatherAffected,
        );
      }
    }

    // 8. Log to RecommendationLog — coarsened location ONLY, never raw GPS
    const locationHash = coarsenLocation(currentLat, currentLng);
    await this.prisma.recommendationLog.create({
      data: {
        userId,
        locationHash,           // coarsened — NEVER raw GPS (addendum Section 7)
        city: rawCandidates[0]?.city ?? null,
        budgetBand: null,
        categories: session.interests as string[],
        candidatesReturned: scored.map((c) => c.id),
        aiExplanationUsed: stepExplanations.length > 0,
      },
    });

    return {
      sessionId,
      recommendations: scored.map((c) => ({
        ...c,
        aiExplanation: stepExplanations.find((e) => e.experienceId === c.id)?.stepExplanation,
      })),
      sessionState: {
        remainingTimeMinutes: session.remainingTimeMinutes,
        remainingBudget: session.remainingBudget,
        selectedCount: session.selectedExperienceIds.length,
        stopCondition: stopResult,
      },
      wrapUpPrompt,
      weatherAdaptPrompt,
    };
  }

  // ─── Select / Reject / Remove ─────────────────────────────────────────────

  /**
   * Records a selection, deducts experience duration + travel time from remaining time,
   * deducts cost from remaining budget, and advances current_location.
   *
   * Travel time is computed via estimateTravelTimeMinutes() (Haversine + 20 km/h city speed),
   * ensuring remainingTimeMinutes accounts for getting there, not just the experience itself.
   */
  async addSelection(sessionId: string, userId: string, dto: AddSelectionDto) {
    const session = await this.prisma.tripSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Trip session not found.');
    this.assertOwnership(session.userId, userId);

    const [currentLat, currentLng] = await this.extractLatLng(sessionId, 'current_location');
    const distanceKm = this.haversineDistance(
      currentLat, currentLng,
      dto.nextLatitude, dto.nextLongitude,
    );
    const travelMinutes = estimateTravelTimeMinutes(distanceKm);
    const totalTimeDeduction = dto.durationMinutes + travelMinutes;

    await this.prisma.$queryRawUnsafe(
      `
      UPDATE trip_sessions SET
        selected_experience_ids = array_append(selected_experience_ids, $1::uuid),
        selected_categories = array_append(selected_categories, (
          SELECT category FROM experiences WHERE id = $1::uuid LIMIT 1
        )::"Category"),
        remaining_budget = remaining_budget - $2,
        remaining_time_minutes = GREATEST(0, remaining_time_minutes - $3),
        current_location = ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = $6::uuid
      `,
      dto.experienceId,
      dto.experienceCost,
      totalTimeDeduction,
      dto.nextLongitude,
      dto.nextLatitude,
      sessionId,
    );

    return { success: true, travelMinutesDeducted: travelMinutes, totalDeducted: totalTimeDeduction };
  }

  /**
   * Records a rejection — SESSION-SCOPED ONLY.
   * TODO(consent): Do NOT promote rejectedCategories to TravelerProfile.interests
   * without a separate explicit opt-in consent flow (DPDP compliance).
   */
  async rejectCandidate(sessionId: string, userId: string, dto: RejectCandidateDto) {
    const session = await this.prisma.tripSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Trip session not found.');
    this.assertOwnership(session.userId, userId);

    await this.prisma.$queryRawUnsafe(
      `
      UPDATE trip_sessions SET
        rejected_experience_ids = array_append(rejected_experience_ids, $1::uuid),
        rejected_categories = array_append(rejected_categories, $2::"Category"),
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = $3::uuid
      `,
      dto.experienceId,
      dto.category,
      sessionId,
    );

    return { success: true };
  }

  async removeStop(sessionId: string, userId: string, experienceId: string) {
    const session = await this.prisma.tripSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Trip session not found.');
    this.assertOwnership(session.userId, userId);

    await this.prisma.$queryRawUnsafe(
      `
      UPDATE trip_sessions SET
        selected_experience_ids = array_remove(selected_experience_ids, $1::uuid),
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = $2::uuid
      `,
      experienceId,
      sessionId,
    );

    return { success: true };
  }

  // ─── Status transitions ───────────────────────────────────────────────────

  async markComplete(sessionId: string, userId: string) {
    return this.transitionStatus(sessionId, userId, TripSessionStatus.COMPLETED);
  }

  async markAbandoned(sessionId: string, userId: string) {
    return this.transitionStatus(sessionId, userId, TripSessionStatus.ABANDONED);
  }

  private async transitionStatus(
    sessionId: string,
    userId: string,
    newStatus: TripSessionStatus,
  ) {
    const session = await this.prisma.tripSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Trip session not found.');
    this.assertOwnership(session.userId, userId);

    return this.prisma.tripSession.update({
      where: { id: sessionId },
      data: { status: newStatus, updatedAt: new Date() },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertOwnership(sessionUserId: string, requestUserId: string) {
    if (sessionUserId !== requestUserId) {
      throw new ForbiddenException('You do not have access to this trip session.');
    }
  }

  private async extractLatLng(
    sessionId: string,
    column: 'current_location' | 'start_location',
  ): Promise<[number, number]> {
    const rows = await this.prisma.$queryRawUnsafe<{ lat: number; lng: number }[]>(
      `SELECT ST_Y(${column}::geometry) as lat, ST_X(${column}::geometry) as lng
       FROM trip_sessions WHERE id = $1::uuid`,
      sessionId,
    );
    const row = rows[0];
    return [row?.lat ?? 0, row?.lng ?? 0];
  }

  private async fetchCandidatesNear(
    lat: number,
    lng: number,
    radiusKm: number,
    maxBudget: number,
    excludedIds: string[],
  ) {
    // Note: weatherTag must be present in the raw query result for Layer 1 filtering
    return this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        e.id, e.title, e.category, e.city,
        e.price_min as "priceMin", e.price_max as "priceMax",
        e.budget_band as "budgetBand",
        e.rating_average as "ratingAverage", e.review_count as "reviewCount",
        e.authenticity_rating as "authenticityRating",
        e.accessibility_tags as "accessibilityTags",
        e.media_urls as "mediaUrls",
        e.availability_rules as "availabilityRules",
        e.duration_minutes as "durationMinutes",
        e.weather_tag as "weatherTag",
        ST_Y(e.location::geometry) as "candidateLat",
        ST_X(e.location::geometry) as "candidateLng",
        ST_Distance(
          e.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) / 1000 as "distanceKm"
      FROM experiences e
      WHERE
        e.is_active = true
        AND e.price_min <= $3
        AND ST_DWithin(
          e.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $4 * 1000
        )
        ${excludedIds.length > 0 ? `AND e.id != ALL($5::uuid[])` : ''}
      ORDER BY "distanceKm"
      LIMIT 50
      `,
      lat,
      lng,
      maxBudget,
      radiusKm,
      ...(excludedIds.length > 0 ? [excludedIds] : []),
    );
  }

  /**
   * Haversine formula for distance in km between two GPS points.
   */
  private haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
