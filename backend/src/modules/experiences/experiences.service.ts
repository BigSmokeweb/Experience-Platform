import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentSanitizer } from '../../common/utils/sanitizer.util';
import {
  CreateExperienceDto,
  AddPlaceDto,
  UpdateExperienceDto,
  SearchExperiencesQueryDto,
  PaginatedResult,
  Category,
  BudgetBand,
  Role,
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

const SUPABASE_CDN_PREFIX =
  (process.env.SUPABASE_URL || 'https://mvsnmwznonupjypacswj.supabase.co') +
  '/storage/v1/object/public/catalog-images';

export function ensureCdnUrl(u?: string): string {
  if (!u || typeof u !== 'string') return '';
  const clean = u.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const sub = clean.replace(/^\/?catalog-images\//, '');
  return `${SUPABASE_CDN_PREFIX}/${sub}`;
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
    try {
      const experience = await this.prisma.$queryRawUnsafe<any[]>(
        `
        INSERT INTO "experiences" (
          "id", "provider_id", "submitted_by_user_id", "submitted_by_role", "title", "description", "category",
          "location", "latitude", "longitude", "address", "city", "state", "country",
          "price_min", "price_max", "currency", "budget_band", "accessibility_tags",
          "media_urls", "availability_rules", "duration_minutes", "published", "updated_at"
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $3::"Role", $4, $5, $6::"Category",
          ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $8, $7, $9, $10, $11, $12,
          $13, $14, $15, $16::"BudgetBand", $17::text[],
          $18::text[], $19::jsonb, $20, $21, NOW()
        )
        RETURNING
          "id", "provider_id" AS "providerId", "submitted_by_user_id" AS "submittedByUserId", "submitted_by_role" AS "submittedByRole",
          "title", "description", "category", "latitude", "longitude", "address", "city", "state", "country",
          "price_min" AS "priceMin", "price_max" AS "priceMax", "currency",
          "budget_band" AS "budgetBand", "accessibility_tags" AS "accessibilityTags",
          "media_urls" AS "mediaUrls", "availability_rules" AS "availabilityRules",
          "duration_minutes" AS "durationMinutes", "published", "updated_at" AS "updatedAt";
        `,
        provider.id,
        userId,
        Role.PROVIDER,
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
    } catch (dbError: any) {
      console.error('[ExperiencesService.createExperience] Error inserting experience:', dbError);
      throw dbError;
    }
  }

  /**
   * Add a Place (Single-screen shared entry point for Travelers & Owners)
   */
  async addPlace(userId: string, dto: AddPlaceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { providerProfile: true },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    let providerId: string | null = null;
    let submittedByRole: Role = Role.TRAVELER;
    let published = false; // Travelers go to moderation queue (published = false)

    if (dto.isOwner) {
      submittedByRole = Role.PROVIDER;
      published = true; // Auto-publish for business owners submitting their own place

      if (user.providerProfile) {
        providerId = user.providerProfile.id;
      } else {
        // Automatically create a minimal ProviderProfile for the owner if they don't have one yet
        const newProvider = await this.prisma.providerProfile.create({
          data: {
            userId: user.id,
            businessName: dto.title.trim(),
            businessType: 'Local Business',
            phone: '+910000000000',
            city: dto.city.trim(),
          },
        });
        providerId = newProvider.id;

        // Ensure user role reflects PROVIDER
        if (user.role !== Role.ADMIN) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { role: Role.PROVIDER },
          });
        }
      }
    } else {
      // Traveler submission
      submittedByRole = Role.TRAVELER;
      published = false;
      // If the user already happens to have a provider profile, we still keep providerId null or linked
      if (user.providerProfile) {
        providerId = user.providerProfile.id;
      }
    }

    const sanitizedTitle = ContentSanitizer.stripAll(dto.title);
    const sanitizedDescription = ContentSanitizer.sanitize(dto.description);

    // Map costTier to price ranges and budgetBand
    let priceMin = 0;
    let priceMax = 500;
    let budgetBand = BudgetBand.BUDGET;

    switch (dto.costTier) {
      case 'FREE':
        priceMin = 0;
        priceMax = 0;
        budgetBand = BudgetBand.BUDGET;
        break;
      case 'BUDGET':
        priceMin = 50;
        priceMax = 500;
        budgetBand = BudgetBand.BUDGET;
        break;
      case 'MODERATE':
        priceMin = 500;
        priceMax = 1500;
        budgetBand = BudgetBand.MODERATE;
        break;
      case 'PREMIUM':
        priceMin = 1500;
        priceMax = 4000;
        budgetBand = BudgetBand.PREMIUM;
        break;
      default:
        priceMin = 100;
        priceMax = 1000;
        budgetBand = BudgetBand.MODERATE;
    }

    // Strip data: URIs — they're ephemeral browser blobs and don't belong in the DB.
    // If the user uploaded a file locally, we ignore it here; a real CDN upload flow handles media.
    const photoUrlClean =
      dto.photoUrl && dto.photoUrl.trim() && !dto.photoUrl.trim().startsWith('data:')
        ? dto.photoUrl.trim()
        : null;
    const mediaUrls = photoUrlClean ? [photoUrlClean] : [];

    const defaultAvailabilityRules = [
      { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], openTime: '09:00', closeTime: '21:00', slotDurationMinutes: 60, maxCapacityPerSlot: 10 },
    ];

    try {
      const experience = await this.prisma.$queryRawUnsafe<any[]>(
        `
        INSERT INTO "experiences" (
          "id", "provider_id", "submitted_by_user_id", "submitted_by_role", "title", "description", "category",
          "location", "latitude", "longitude", "address", "city", "state", "country",
          "price_min", "price_max", "currency", "budget_band", "accessibility_tags",
          "media_urls", "availability_rules", "duration_minutes", "published", "updated_at"
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $3::"Role", $4, $5, $6::"Category",
          ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $8, $7, $9, $10, $11, $12,
          $13, $14, $15, $16::"BudgetBand", $17::text[],
          $18::text[], $19::jsonb, $20, $21, NOW()
        )
        RETURNING
          "id", "provider_id" AS "providerId", "submitted_by_user_id" AS "submittedByUserId", "submitted_by_role" AS "submittedByRole",
          "title", "description", "category", "latitude", "longitude", "address", "city", "state", "country",
          "price_min" AS "priceMin", "price_max" AS "priceMax", "currency",
          "budget_band" AS "budgetBand", "accessibility_tags" AS "accessibilityTags",
          "media_urls" AS "mediaUrls", "availability_rules" AS "availabilityRules",
          "duration_minutes" AS "durationMinutes", "published", "updated_at" AS "updatedAt";
        `,
        providerId,
        userId,
        submittedByRole,
        sanitizedTitle,
        sanitizedDescription,
        dto.category,
        dto.longitude,
        dto.latitude,
        dto.address,
        dto.city,
        dto.state || 'Maharashtra',
        'India',
        priceMin,
        priceMax,
        'INR',
        budgetBand,
        [],
        mediaUrls,
        JSON.stringify(defaultAvailabilityRules),
        60,
        published,
      );

      // Normalize availabilityRules: Prisma's pg driver returns integer arrays inside JSONB
      // as space-separated strings (e.g. "0 1 2 3 4 5 6") instead of [0,1,2,3,4,5,6].
      // Return the known default directly to avoid the round-trip deserialization quirk.
      return {
        ...experience[0],
        availabilityRules: defaultAvailabilityRules,
        message: published
          ? 'Place successfully listed and published!'
          : 'Place submitted for community review! It will appear once approved by our curators.',
      };
    } catch (dbError: any) {
      console.error('[ExperiencesService.addPlace] Error inserting place:', dbError);
      throw dbError;
    }
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

    return results.map((r: any) => ({
      ...r,
      mediaUrls: Array.isArray(r.mediaUrls) ? r.mediaUrls.map(ensureCdnUrl) : [],
    }));
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
    const limit = Math.min(params.limit || 50, 500);
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
      const coverUrl = ensureCdnUrl(meta.cover || exp.mediaUrls?.[0] || '');
      const mediaList = (exp.mediaUrls || []).map(ensureCdnUrl);
      if (coverUrl && !mediaList.includes(coverUrl)) {
        mediaList.unshift(coverUrl);
      }
      return {
        ...exp,
        candidateLat: exp.latitude,
        candidateLng: exp.longitude,
        cover: coverUrl,
        mediaUrls: mediaList,
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
    const coverUrl = ensureCdnUrl(meta.cover || experience.mediaUrls?.[0] || '');
    const mediaList = (experience.mediaUrls || []).map(ensureCdnUrl);
    if (coverUrl && !mediaList.includes(coverUrl)) {
      mediaList.unshift(coverUrl);
    }
    return {
      ...experience,
      candidateLat: experience.latitude,
      candidateLng: experience.longitude,
      cover: coverUrl,
      mediaUrls: mediaList,
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

  /**
   * Get all spots submitted / discovered by a specific user.
   * Scoped to submittedByUserId = userId.
   */
  async getUserSubmissions(userId: string) {
    const experiences = await this.prisma.experience.findMany({
      where: { submittedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        city: true,
        state: true,
        address: true,
        latitude: true,
        longitude: true,
        budgetBand: true,
        priceMin: true,
        priceMax: true,
        mediaUrls: true,
        published: true,
        createdAt: true,
        submittedByRole: true,
      },
    });

    return experiences.map((exp) => ({
      ...exp,
      cover: exp.mediaUrls?.[0] ? ensureCdnUrl(exp.mediaUrls[0]) : null,
      mediaUrls: (exp.mediaUrls || []).map(ensureCdnUrl),
    }));
  }
}

