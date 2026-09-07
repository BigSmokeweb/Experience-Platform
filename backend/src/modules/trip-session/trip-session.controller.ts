import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TripSessionService } from './trip-session.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateTripSessionSchema,
  CreateTripSessionDto,
  AddSelectionSchema,
  AddSelectionDto,
  RejectCandidateSchema,
  RejectCandidateDto,
} from '@experience-platform/shared';

@UseGuards(AuthGuard('jwt'))
@Controller('trip-sessions')
export class TripSessionController {
  constructor(private readonly tripSessionService: TripSessionService) {}

  /**
   * POST /trip-sessions
   * Start a new trip session. Throws 409 if an ACTIVE session already exists.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateTripSessionSchema)) dto: CreateTripSessionDto,
  ) {
    return this.tripSessionService.createSession(user.id, dto);
  }

  /**
   * GET /trip-sessions/active
   * Get the caller's current active session.
   */
  @Get('active')
  getActiveSession(@CurrentUser() user: { id: string }) {
    return this.tripSessionService.getActiveSession(user.id);
  }

  /**
   * GET /trip-sessions/history
   * Get the caller's trip history (COMPLETED and ACTIVE sessions visually grouped).
   */
  @Get('history')
  getTripHistory(@CurrentUser() user: { id: string }) {
    return this.tripSessionService.getTripHistory(user.id);
  }

  /**
   * GET /trip-sessions/:id
   * Get a specific session by ID (ownership check enforced in service).
   */
  @Get(':id')
  getSessionById(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripSessionService.getSessionById(id, user.id);
  }

  /**
   * POST /trip-sessions/:id/recommend
   * Get next session-aware recommendations (runs full Layer 1–4 with session context).
   */
  @Post(':id/recommend')
  @HttpCode(HttpStatus.OK)
  getNextRecommendations(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripSessionService.getNextRecommendations(id, user.id);
  }

  /**
   * POST /trip-sessions/:id/select
   * Record a selection; deducts experience duration + travel time from remainingTimeMinutes.
   */
  @Post(':id/select')
  @HttpCode(HttpStatus.OK)
  addSelection(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AddSelectionSchema)) dto: AddSelectionDto,
  ) {
    return this.tripSessionService.addSelection(id, user.id, dto);
  }

  /**
   * POST /trip-sessions/:id/reject
   * Record a rejection (session-scoped only — never touches permanent profile).
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  rejectCandidate(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RejectCandidateSchema)) dto: RejectCandidateDto,
  ) {
    return this.tripSessionService.rejectCandidate(id, user.id, dto);
  }

  /**
   * DELETE /trip-sessions/:id/stops/:experienceId
   * Remove a selected stop (adapt flow — Section 5A).
   * current_location is recalculated from the new last-confirmed stop on the next /recommend call.
   */
  @Delete(':id/stops/:experienceId')
  @HttpCode(HttpStatus.OK)
  removeStop(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('experienceId', ParseUUIDPipe) experienceId: string,
  ) {
    return this.tripSessionService.removeStop(id, user.id, experienceId);
  }

  /**
   * PATCH /trip-sessions/:id/complete
   * Mark the session as COMPLETED.
   */
  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  markComplete(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripSessionService.markComplete(id, user.id);
  }

  /**
   * PATCH /trip-sessions/:id/abandon
   * Mark the session as ABANDONED (triggers cleanup cron eligibility).
   */
  @Patch(':id/abandon')
  @HttpCode(HttpStatus.OK)
  markAbandoned(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripSessionService.markAbandoned(id, user.id);
  }
}
