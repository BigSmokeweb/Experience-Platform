import { PrismaClient, Category, BudgetBand, WeatherTag } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function mapCategory(raw: string): Category {
  const r = (raw || '').toUpperCase().replace(/[^A-Z_]/g, '');
  const valid: Category[] = ['FOOD', 'CULTURE', 'ADVENTURE', 'HIDDEN_GEMS', 'NIGHTLIFE', 'EVENTS', 'WORKSHOPS', 'SHOPPING'];
  if (valid.includes(r as Category)) return r as Category;
  return 'CULTURE';
}

function mapBudgetBand(priceMin: number, priceMax: number): BudgetBand {
  const mid = (priceMin + priceMax) / 2;
  if (mid > 3000) return 'LUXURY';
  if (mid > 1000) return 'PREMIUM';
  if (mid > 300) return 'MODERATE';
  return 'BUDGET';
}

function mapWeatherTag(vibe?: string): WeatherTag {
  const v = (vibe || '').toLowerCase();
  if (v.includes('outdoor') || v.includes('adventure') || v.includes('nature')) return 'OUTDOOR';
  if (v.includes('indoor') || v.includes('museum') || v.includes('café')) return 'INDOOR';
  return 'WEATHER_DEPENDENT';
}

async function main() {
  const datasetPath = path.resolve(__dirname, '../../frontend/src/lib/catalog-dataset.json');
  console.log('Reading catalog dataset from:', datasetPath);
  const raw = fs.readFileSync(datasetPath, 'utf8');
  const dataset: any[] = JSON.parse(raw);
  console.log(`Found ${dataset.length} experiences to sync to Supabase.`);

  // Get or create a default provider
  let provider = await prisma.providerProfile.findFirst();
  if (!provider) {
    const user = await prisma.user.create({
      data: {
        email: 'provider.default@journi.in',
        passwordHash: 'dummy_hash',
        name: 'Journi Verified Host',
        role: 'PROVIDER',
        providerProfile: {
          create: {
            businessName: 'Journi Curated Lineage Keepers',
            businessType: 'HERITAGE_COLLECTIVE',
            phone: '+919876543210',
            city: 'Mumbai',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { providerProfile: true },
    });
    provider = user.providerProfile;
  }

  if (!provider) {
    throw new Error('Could not find or create provider profile');
  }

  const providerId = provider.id;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of dataset) {
    if (!item.id) continue;

    const title = item.title || item.name || 'Local Experience';
    const description = item.description || title;
    const category = mapCategory(item.category);
    const city = item.city || 'Mumbai';
    const state = item.state || 'Maharashtra';
    const area = item.area || null;
    const lat = item.candidateLat ?? item.latitude ?? 18.922;
    const lng = item.candidateLng ?? item.longitude ?? 72.834;
    const priceMin = item.priceMin ?? item.entryFee ?? 0;
    const priceMax = item.priceMax ?? item.activityCost ?? priceMin;
    const budgetBand = mapBudgetBand(priceMin, priceMax);
    const mediaUrls = Array.isArray(item.mediaUrls) ? item.mediaUrls : (item.cover ? [item.cover] : []);
    const durationMinutes = item.durationMinutes ?? 90;
    const ratingAverage = item.ratingAverage ?? 4.8;
    const reviewCount = item.reviewCount ?? 50;
    const authenticityRating = item.authenticityRating ?? 0.95;
    const weatherTag = mapWeatherTag(item.vibe);

    const metadata: Record<string, any> = {
      cover: item.cover || mediaUrls[0] || '',
      categoryLabel: item.categoryLabel || item.category,
      humanTip: item.humanTip || '',
      bestTime: item.bestTime || '',
      vibe: item.vibe || '',
      tags: item.tags || [],
      mustTry: item.mustTry || '',
      operatingHours: item.operatingHours || '',
      closedDays: item.closedDays || '',
      bookingType: item.bookingType || '',
      accessibilityNotes: item.accessibilityNotes || '',
      bestFor: item.bestFor || '',
    };

    try {
      const existing = await prisma.experience.findUnique({
        where: { id: item.id },
      });

      if (existing) {
        await prisma.experience.update({
          where: { id: item.id },
          data: {
            title,
            description,
            category,
            city,
            state,
            area,
            priceMin,
            priceMax,
            budgetBand,
            mediaUrls,
            durationMinutes,
            ratingAverage,
            reviewCount,
            authenticityRating,
            weatherTag,
            metadata,
          },
        });
        updated++;
      } else {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "experiences" (
            "id", "provider_id", "title", "description", "category",
            "location", "latitude", "longitude", "address", "city", "state", "country",
            "price_min", "price_max", "currency", "budget_band", "accessibility_tags",
            "media_urls", "availability_rules", "duration_minutes", "weather_tag",
            "rating_average", "review_count", "authenticity_rating",
            "area", "metadata", "updated_at"
          ) VALUES (
            $1::uuid, $2::uuid, $3, $4, $5::"Category",
            ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $7, $6, $8, $9, $10, 'India',
            $11, $12, 'INR', $13::"BudgetBand", $14::text[],
            $15::text[], $16::jsonb, $17, $18::"WeatherTag", $19, $20, $21,
            $22, $23::jsonb, NOW()
          )`,
          item.id,
          providerId,
          title,
          description,
          category,
          lng,
          lat,
          area || city,
          city,
          state,
          priceMin,
          priceMax,
          budgetBand,
          [],
          mediaUrls,
          JSON.stringify([{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], openTime: '08:00', closeTime: '20:00' }]),
          durationMinutes,
          weatherTag,
          ratingAverage,
          reviewCount,
          authenticityRating,
          area,
          JSON.stringify(metadata)
        );
        inserted++;
      }
    } catch (e: any) {
      console.warn(`Error on item ${item.id} (${title}):`, e.message?.slice(0, 100));
      skipped++;
    }
  }

  const total = await prisma.experience.count();
  console.log(`\nSync finished! Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
  console.log(`Total experiences in Supabase database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
