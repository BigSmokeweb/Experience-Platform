import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentSanitizer } from '../../common/utils/sanitizer.util';
import {
  CreateReviewDto,
  LogInteractionDto,
  EventType,
} from '@experience-platform/shared';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log User Interaction (Append-only event log)
   */
  async logInteraction(userId: string, dto: LogInteractionDto) {
    return this.prisma.interaction.create({
      data: {
        userId,
        experienceId: dto.experienceId,
        eventType: dto.eventType,
        metadata: dto.metadata as any,
      },
    });
  }

  /**
   * Get Current User's Review for an Experience (if any)
   */
  async getUserReviewForExperience(userId: string, experienceId: string) {
    return this.prisma.review.findUnique({
      where: {
        userId_experienceId: {
          userId,
          experienceId,
        },
      },
    });
  }

  /**
   * Create or Update Review (Strict guardrails: 1 rating per user per place, UGC sanitization, atomic rolling average)
   */
  async createReview(userId: string, dto: CreateReviewDto) {
    // 1. Check if experience exists
    const experience = await this.prisma.experience.findUnique({
      where: { id: dto.experienceId },
      select: { id: true },
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    // 2. Check for optional completed visit interaction to attach verified badge
    const completedInteraction = await this.prisma.interaction.findFirst({
      where: {
        userId,
        experienceId: dto.experienceId,
        eventType: EventType.COMPLETE,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Strict UGC Sanitization on Write
    const sanitizedText = dto.text ? ContentSanitizer.sanitize(dto.text) : '';

    const ratingOverall = Math.max(1, Math.min(5, Math.round(dto.ratingOverall)));
    const ratingAuthenticity = dto.ratingAuthenticity ?? ratingOverall;
    const ratingValue = dto.ratingValue ?? ratingOverall;
    const ratingExperience = dto.ratingExperience ?? ratingOverall;
    const ratingAccessibility = dto.ratingAccessibility ?? ratingOverall;

    // 4. Guardrail: 1 review per user per place (Upsert in transaction)
    const review = await this.prisma.$transaction(async (tx) => {
      const savedReview = await tx.review.upsert({
        where: {
          userId_experienceId: {
            userId,
            experienceId: dto.experienceId,
          },
        },
        create: {
          experienceId: dto.experienceId,
          userId,
          interactionId: completedInteraction ? completedInteraction.id : undefined,
          ratingOverall,
          ratingAuthenticity,
          ratingValue,
          ratingExperience,
          ratingAccessibility,
          text: sanitizedText,
          isModerated: true,
        },
        update: {
          ratingOverall,
          ratingAuthenticity,
          ratingValue,
          ratingExperience,
          ratingAccessibility,
          text: sanitizedText,
          ...(completedInteraction ? { interactionId: completedInteraction.id } : {}),
        },
      });

      // 5. Recalculate average rating & review count for experience
      const agg = await tx.review.aggregate({
        where: { experienceId: dto.experienceId, isModerated: true },
        _avg: {
          ratingOverall: true,
          ratingAuthenticity: true,
        },
        _count: {
          id: true,
        },
      });

      const newRatingAverage = Math.round((agg._avg.ratingOverall || ratingOverall) * 10) / 10;
      const newAuthRating = Math.round(((agg._avg.ratingAuthenticity || ratingOverall) / 5.0) * 100) / 100;

      await tx.experience.update({
        where: { id: dto.experienceId },
        data: {
          ratingAverage: newRatingAverage,
          authenticityRating: newAuthRating,
          reviewCount: agg._count.id,
        },
      });

      return savedReview;
    });

    return review;
  }
}
