import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentSanitizer } from '../../common/utils/sanitizer.util';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
  SearchExperiencesQueryDto,
  PaginatedResult,
  Category,
  BudgetBand,
} from '@experience-platform/shared';
import { computeListingNudges } from './listing-nudges.util';

/** Minimum fields required to auto-set published = true */
function isPublishEligible(fields: {
  title?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  priceMin?: number;
  priceMax?: number;
  mediaUrls?: string[];
}): boolean {
  return (
    Boolean(fields.title?.trim()) &&
    Boolean(fields.category) &&
    fields.latitude !== undefined &&
    fields.longitude !== undefined &&
    fields.priceMin !== undefined &&
    fields.priceMax !== undefined &&
    (fields.mediaUrls ?? []).length >= 1
  );
}

@Injectable()
export class ExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create Experience (Sanitizes descriptions on write, sets PostGIS Point)
   */
  async createExperience(userId: string, dto: CreateExperienceDto) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!provider) {
      throw new ForbiddenException('Only registered providers can create experiences');
    }

    const sanitizedDescription = ContentSanitizer.sanitize(dto.description);
    const sanitizedTitle = ContentSanitizer.stripAll(dto.title);

    // Compute publish eligibility from minimum required fields
    const published = isPublishEligible({
      title: dto.title,
      category: dto.category,
      latitude: dto.location?.latitude,
      longitude: dto.location?.longitude,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      mediaUrls: dto.mediaUrls,
    });

    // Using parameterized query for PostGIS geography Point creation
    const experience = await this.prisma.$queryRawUnsafe<any[]>(
      `
      INSERT INTO "experiences" (
        "id", "provider_id", "title", "description", "category",
        "location", "latitude", "longitude", "address", "city", "state", "country",
        "price_min", "price_max", "currency", "budget_band", "accessibility_tags",
        "media_urls", "availability_rules", "duration_minutes", "published", "updated_at"
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4::"Category",
        ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $6, $5, $7, $8, $9, $10,
        $11, $12, $13, $14::"BudgetBand", $15::text[],
        $16::text[], $17::jsonb, $18, $19, NOW()
      )
      RETURNING *;
      `,
      provider.id,
      sanitizedTitle,
      sanitizedDescription,
      dto.category,
      dto.location.longitude,
      dto.location.latitude,
      dto.address,
      dto.city,
      dto.state,
      dto.country,
      dto.priceMin,
      dto.priceMax,
      dto.currency,
      dto.budgetBand,
      dto.accessibilityTags,
      dto.mediaUrls,
      JSON.stringify(dto.availabilityRules),
      dto.durationMinutes,
      published,
    );

    return experience[0];
  }

  /**
   * Update Experience with IDOR check
   */
  async updateExperience(userId: string, experienceId: string, dto: UpdateExperienceDto) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new ForbiddenException();

    const existing = await this.prisma.experience.findUnique({ where: { id: experienceId } });
    if (!existing) throw new NotFoundException('Experience not found');
    if (existing.providerId !== provider.id) {
      throw new ForbiddenException('IDOR Violation: You do not own this experience');
    }

    // Merge update fields with existing to recompute publish eligibility
    const mergedTitle = dto.title ? ContentSanitizer.stripAll(dto.title) : existing.title;
    const mergedCategory = dto.category ?? existing.category;
    const mergedPriceMin = dto.priceMin ?? existing.priceMin;
    const mergedPriceMax = dto.priceMax ?? existing.priceMax;
    const mergedMediaUrls = dto.mediaUrls ?? existing.mediaUrls;

    const published = isPublishEligible({
      title: mergedTitle,
      category: mergedCategory,
      latitude: existing.latitude,
      longitude: existing.longitude,
      priceMin: mergedPriceMin,
      priceMax: mergedPriceMax,
      mediaUrls: mergedMediaUrls,
    });

    return this.prisma.experience.update({
      where: { id: experienceId },
      data: {
        title: mergedTitle,
        description: dto.description ? ContentSanitizer.sanitize(dto.description) : undefined,
        category: mergedCategory,
        priceMin: mergedPriceMin,
        priceMax: mergedPriceMax,
        budgetBand: dto.budgetBand,
        accessibilityTags: dto.accessibilityTags,
        mediaUrls: mergedMediaUrls,
        availabilityRules: dto.availabilityRules as any,
        durationMinutes: dto.durationMinutes,
        published,
      },
    });
  }

  /**
   * PostGIS Geo-Radius Search with Enforced Pagination
   * Exclusively lives in this service and is consumed by Recommendation Engine.
   */
  async findWithinRadius(params: {
    latitude: number;
    longitude: number;
    radiusKm: number;
    categories?: Category[];
    budgetBand?: BudgetBand;
    minRating?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const radiusMeters = (params.radiusKm || 25) * 1000;
    const limit = Math.min(params.limit || 20, 50); // Enforce max 50 items
    const offset = params.offset || 0;

    // Build dynamic parameterized query — all values flow through $N placeholders (no interpolation)
    const queryArgs: any[] = [
      params.longitude,   // $1
      params.latitude,    // $2
      radiusMeters,       // $3
    ];

    // $4 — optional categories array
    const hasCats = params.categories && params.categories.length > 0;
    let catClause = '';
    if (hasCats) {
      queryArgs.push(params.categories);
      catClause = `AND e.category = ANY($4::"Category"[])`;
    }

    // $5 / $6 / $7 — optional budget band and min rating (parameterized, never interpolated)
    let budgetClause = '';
    if (params.budgetBand) {
      queryArgs.push(params.budgetBand);
      budgetClause = `AND e.budget_band = $${queryArgs.length}::"BudgetBand"`;
    }

    let ratingClause = '';
    if (params.minRating) {
      queryArgs.push(params.minRating);
      ratingClause = `AND e.rating_average >= $${queryArgs.length}`;
    }

    // $N-1, $N — limit and offset (always last)
    queryArgs.push(limit);
    const limitIdx = queryArgs.length;
    queryArgs.push(offset);
    const offsetIdx = queryArgs.length;

    const results = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        e.id, e.title, e.description, e.category, e.city, e.state, e.address,
        e.price_min AS "priceMin", e.price_max AS "priceMax", e.currency,
        e.budget_band AS "budgetBand", e.accessibility_tags AS "accessibilityTags",
        e.media_urls AS "mediaUrls", e.availability_rules AS "availabilityRules",
        e.duration_minutes AS "durationMinutes", e.quality_score AS "qualityScore",
        e.rating_average AS "ratingAverage", e.review_count AS "reviewCount",
        e.authenticity_rating AS "authenticityRating",
        p.business_name AS "providerBusinessName", p.verification_status AS "verificationStatus",
        ROUND((ST_Distance(e.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000)::numeric, 2) AS "distanceKm"
      FROM "experiences" e
      JOIN "provider_profiles" p ON e.provider_id = p.id
      WHERE e.is_active = true
        AND e.published = true
        AND ST_DWithin(e.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ${catClause}
        ${budgetClause}
        ${ratingClause}
      ORDER BY "distanceKm" ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
      `,
      ...queryArgs,
    );

    return results;
  }

  /**
   * Search / Discovery endpoint with enforced pagination (Max 50 items)
   */
  async searchExperiences(query: SearchExperiencesQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50); // Pagination limit cap
    const offset = (page - 1) * limit;

    if (query.latitude !== undefined && query.longitude !== undefined) {
      const items = await this.findWithinRadius({
        latitude: query.latitude,
        longitude: query.longitude,
        radiusKm: query.radiusKm || 25,
        categories: query.category ? [query.category] : undefined,
        budgetBand: query.budgetBand,
        minRating: query.minRating,
        limit,
        offset,
      });

      return {
        data: items,
        total: items.length,
        page,
        limit,
        totalPages: Math.ceil(items.length / limit) || 1,
      };
    }

    // Fallback: Standard City/Category filtered search
    const whereClause: any = {
      isActive: true,
      published: true,  // CRITICAL: draft exclusion enforced at query layer
      ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
      ...(query.category && { category: query.category }),
      ...(query.budgetBand && { budgetBand: query.budgetBand }),
      ...(query.minRating && { ratingAverage: { gte: query.minRating } }),
    };

    // Text search support
    if ((query as any).search) {
      const searchTerm = (query as any).search.trim();
      if (searchTerm) {
        whereClause.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { area: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.experience.count({ where: whereClause }),
      this.prisma.experience.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { ratingAverage: 'desc' },
        include: {
          provider: {
            select: {
              businessName: true,
              verificationStatus: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Catalog endpoint: returns ALL experiences as lightweight card data.
   * Supports city/category filtering. Returns all fields needed by the frontend.
   * Uses server-side caching via ISR on the Next.js side.
   */
  async catalogExperiences(params: {
    city?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<any>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const offset = (page - 1) * limit;

    const whereClause: any = {
      isActive: true,
      published: true,
    };

    if (params.city) {
      whereClause.city = { equals: params.city, mode: 'insensitive' };
    }
    if (params.category) {
      whereClause.category = params.category;
    }
    if (params.search) {
      const s = params.search.trim();
      if (s) {
        whereClause.OR = [
          { title: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
          { city: { contains: s, mode: 'insensitive' } },
          { area: { contains: s, mode: 'insensitive' } },
        ];
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.experience.count({ where: whereClause }),
      this.prisma.experience.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { ratingAverage: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          city: true,
          state: true,
          area: true,
          latitude: true,
          longitude: true,
          address: true,
          priceMin: true,
          priceMax: true,
          budgetBand: true,
          durationMinutes: true,
          ratingAverage: true,
          reviewCount: true,
          authenticityRating: true,
          mediaUrls: true,
          weatherTag: true,
          metadata: true,
          provider: {
            select: {
              businessName: true,
              verificationStatus: true,
            },
          },
        },
      }),
    ]);

    const mapped = data.map((exp: any) => {
      const meta = (exp.metadata as any) || {};
      return {
        ...exp,
        candidateLat: exp.latitude,
        candidateLng: exp.longitude,
        cover: meta.cover || exp.mediaUrls?.[0] || '',
        categoryLabel: meta.categoryLabel || exp.category,
        humanTip: meta.humanTip || '',
        bestTime: meta.bestTime || '',
        vibe: meta.vibe || '',
        tags: meta.tags || [],
        mustTry: meta.mustTry || '',
        operatingHours: meta.operatingHours || '',
        closedDays: meta.closedDays || '',
        bookingType: meta.bookingType || '',
        accessibilityNotes: meta.accessibilityNotes || '',
        bestFor: meta.bestFor || '',
      };
    });

    return {
      data: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single experience by ID with reviews
   */
  async getExperienceById(id: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            city: true,
            verificationStatus: true,
          },
        },
        reviews: {
          where: { isModerated: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    const meta = (experience.metadata as any) || {};
    return {
      ...experience,
      candidateLat: experience.latitude,
      candidateLng: experience.longitude,
      cover: meta.cover || experience.mediaUrls?.[0] || '',
      categoryLabel: meta.categoryLabel || experience.category,
      humanTip: meta.humanTip || '',
      bestTime: meta.bestTime || '',
      vibe: meta.vibe || '',
      tags: meta.tags || [],
      mustTry: meta.mustTry || '',
      operatingHours: meta.operatingHours || '',
      closedDays: meta.closedDays || '',
      bookingType: meta.bookingType || '',
      accessibilityNotes: meta.accessibilityNotes || '',
      bestFor: meta.bestFor || '',
    };
  }

  /**
   * Get all experiences (drafts + published) for a provider's own dashboard.
   * Returns nudges for each listing so the dashboard can surface them on load.
   * IDOR-safe: filters by authenticated provider's profile ID only.
   */
  async getProviderExperiences(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) {
      throw new ForbiddenException('Only registered providers can access their listings');
    }

    const experiences = await this.prisma.experience.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: { businessName: true, verificationStatus: true },
        },
        _count: { select: { reviews: true } },
      },
    });

    // Attach nudges to each listing (pure, no writes)
    return experiences.map((exp) => ({
      ...exp,
      nudges: computeListingNudges({
        accessibilityTags: exp.accessibilityTags,
        availabilityRules: Array.isArray(exp.availabilityRules)
          ? (exp.availabilityRules as any[])
          : [],
        priceMin: exp.priceMin,
        priceMax: exp.priceMax,
        mediaUrls: exp.mediaUrls,
        description: exp.description,
      }),
    }));
  }
}
