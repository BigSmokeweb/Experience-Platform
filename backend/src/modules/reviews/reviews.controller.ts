import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateReviewSchema,
  CreateReviewDto,
  LogInteractionSchema,
  LogInteractionDto,
} from '@experience-platform/shared';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('interactions')
  @UsePipes(new ZodValidationPipe(LogInteractionSchema))
  async logInteraction(
    @CurrentUser('id') userId: string,
    @Body() dto: LogInteractionDto,
  ) {
    return this.reviewsService.logInteraction(userId, dto);
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('reviews/experience/:experienceId/mine')
  async getMyReview(
    @CurrentUser('id') userId: string,
    @Param('experienceId') experienceId: string,
  ) {
    return this.reviewsService.getUserReviewForExperience(userId, experienceId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reviews')
  @UsePipes(new ZodValidationPipe(CreateReviewSchema))
  async createReview(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, dto);
  }
}
