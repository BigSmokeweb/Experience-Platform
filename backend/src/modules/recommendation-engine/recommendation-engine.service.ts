import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExperiencesService, ensureCdnUrl } from '../experiences/experiences.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeterministicScoringEngine, RawCandidateInput } from './deterministic-scoring.engine';
import { DEFAULT_RECOMMENDATION_WEIGHTS, RecommendationWeights } from './recommendation.config';
import { LocationPrivacy } from '../../common/utils/location-privacy.util';
import {
  RecommendationRequestDto,
  RecommendationResponseDto,
  RecommendationCandidateDto,
} from '@experience-platform/shared';
import * as crypto from 'crypto';

@Injectable()
export class RecommendationEngineService {
  private readonly weights: RecommendationWeights;

  constructor(
    private readonly experiencesService: ExperiencesService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.weights = {
      w1_locationMatch: Number(this.configService.get('REC_WEIGHT_LOCATION', DEFAULT_RECOMMENDATION_WEIGHTS.w1_locationMatch)),
      w2_intentMatch: Number(this.configService.get('REC_WEIGHT_INTENT', DEFAULT_RECOMMENDATION_WEIGHTS.w2_intentMatch)),
      w3_budgetFit: Number(this.configService.get('REC_WEIGHT_BUDGET', DEFAULT_RECOMMENDATION_WEIGHTS.w3_budgetFit)),
      w4_timeAvailability: Number(this.configService.get('REC_WEIGHT_TIME', DEFAULT_RECOMMENDATION_WEIGHTS.w4_timeAvailability)),
      w5_rating: Number(this.configService.get('REC_WEIGHT_RATING', DEFAULT_RECOMMENDATION_WEIGHTS.w5_rating)),
      w6_authenticity: Number(this.configService.get('REC_WEIGHT_AUTH', DEFAULT_RECOMMENDATION_WEIGHTS.w6_authenticity)),
      w7_distancePenalty: Number(this.configService.get('REC_WEIGHT_DIST_PENALTY', DEFAULT_RECOMMENDATION_WEIGHTS.w7_distancePenalty)),
      w8_routeContinuity: Number(this.configService.get('REC_WEIGHT_ROUTE_CONTINUITY', DEFAULT_RECOMMENDATION_WEIGHTS.w8_routeContinuity)),
      w9_diversity: Number(this.configService.get('REC_WEIGHT_DIVERSITY', DEFAULT_RECOMMENDATION_WEIGHTS.w9_diversity)),
      w10_rejectionPenalty: Number(this.configService.get('REC_WEIGHT_REJECTION_PENALTY', DEFAULT_RECOMMENDATION_WEIGHTS.w10_rejectionPenalty)),
    };
  }

  /**
   * Main recommendation pipeline:
   * 1. Query candidates via ExperiencesService PostGIS geo-query
   * 2. Apply Pure Deterministic Filtering & Scoring
   * 3. Anonymize location context and log request to RecommendationLog
   * 4. Return ranked candidate set with zero LLM dependency
   */
  async getRecommendations(
    dto: RecommendationRequestDto,
    userId?: string,
  ): Promise<RecommendationResponseDto> {
    const radiusKm = dto.radiusKm || 20;

    // Call ExperiencesService for PostGIS geo-query (No query duplication)
    const rawResults = await this.experiencesService.findWithinRadius({
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusKm,
      categories: dto.categories,
      budgetBand: dto.budgetBand,
      limit: 50, // Fetch top candidates within radius for engine scoring
    });

    const candidates: RawCandidateInput[] = rawResults.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      city: r.city,
      distanceKm: Number(r.distanceKm),
      priceMin: Number(r.priceMin),
      priceMax: Number(r.priceMax),
      budgetBand: r.budgetBand,
      ratingAverage: Number(r.ratingAverage),
      reviewCount: Number(r.reviewCount),
      authenticityRating: Number(r.authenticityRating),
      accessibilityTags: r.accessibilityTags || [],
      mediaUrls: (r.mediaUrls || []).map(ensureCdnUrl),
      availabilityRules: Array.isArray(r.availabilityRules) ? r.availabilityRules : [],
    }));

    // Deterministic ranking
    const rankedCandidates: RecommendationCandidateDto[] = DeterministicScoringEngine.rankCandidates(
      candidates,
      {
        maxDistanceKm: radiusKm,
        userCategories: dto.categories,
        userBudgetBand: dto.budgetBand,
        limit: dto.limit || 10,
      },
      this.weights,
    );

    // Compute coarse anonymized hash of location context for privacy compliance (DPDP)
    const locationContextHash = LocationPrivacy.anonymizeCoordinateContext(
      dto.latitude,
      dto.longitude,
      rawResults[0]?.city,
    );

    const requestId = crypto.randomUUID();

    // Audit log request into RecommendationLog
    await this.prisma.recommendationLog.create({
      data: {
        userId: userId || null,
        locationHash: locationContextHash,
        city: rawResults[0]?.city || null,
        budgetBand: dto.budgetBand || null,
        categories: (dto.categories || []).map((c) => c.toString()),
        candidatesReturned: rankedCandidates.map((c) => c.id),
        aiExplanationUsed: false,
      },
    });

    return {
      requestId,
      recommendations: rankedCandidates,
      locationContextHash,
      generatedAt: new Date().toISOString(),
    };
  }
}
