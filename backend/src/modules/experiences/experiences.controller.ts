import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ExperiencesService } from './experiences.service';
import { MatchPreviewService } from './match-preview.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  CreateExperienceSchema,
  CreateExperienceDto,
  UpdateExperienceSchema,
  UpdateExperienceDto,
  SearchExperiencesQuerySchema,
  SearchExperiencesQueryDto,
  MatchPreviewRequestSchema,
  MatchPreviewRequestDto,
} from '@experience-platform/shared';

@Controller('experiences')
export class ExperiencesController {
  constructor(
    private readonly experiencesService: ExperiencesService,
    private readonly matchPreviewService: MatchPreviewService,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 req/min search endpoint rate limit
  @Get('search')
  @UsePipes(new ZodValidationPipe(SearchExperiencesQuerySchema))
  async search(@Query() query: SearchExperiencesQueryDto) {
    return this.experiencesService.searchExperiences(query);
  }

  /**
   * Public catalog endpoint: lightweight card data for frontend pages.
   * No auth required. Supports ?city=X&category=Y&search=Z&page=1&limit=50
   */
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('catalog')
  async catalog(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.experiencesService.catalogExperiences({
      city: city || undefined,
      category: category || undefined,
      search: search || undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Provider: fetch own listings (drafts + published) with nudges.
   * Traveler-facing search never includes this endpoint.
   */
  @Get('my-listings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  async myListings(@CurrentUser('id') userId: string) {
    return this.experiencesService.getProviderExperiences(userId);
  }

  /**
   * Provider: get a live match-preview for a draft payload.
   * READ-ONLY — no DB writes, no RecommendationLog write, no LLM call.
   */
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // debounce handled client-side; allow burst
  @Post('match-preview')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @UsePipes(new ZodValidationPipe(MatchPreviewRequestSchema))
  async matchPreview(@Body() dto: MatchPreviewRequestDto) {
    return this.matchPreviewService.buildPreview(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.experiencesService.getExperienceById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateExperienceSchema))
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExperienceDto,
  ) {
    return this.experiencesService.createExperience(userId, dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateExperienceSchema))
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.experiencesService.updateExperience(userId, id, dto);
  }
}
