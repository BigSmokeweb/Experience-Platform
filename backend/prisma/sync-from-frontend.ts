/**
 * Step 1: Extract the ALL_EXPERIENCES array from the frontend TS file to a JSON file
 * Step 2: Read it and upsert into DB
 * 
 * Run: npx ts-node prisma/sync-from-frontend.ts
 */
import { PrismaClient, BudgetBand, Category, WeatherTag } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function mapCategory(raw: string): Category {
  const r = (raw || '').toUpperCase().replace(/[^A-Z_]/g, '');
  const valid: Category[] = ['FOOD', 'CULTURE', 'ADVENTURE', 'HIDDEN_GEMS', 'NIGHTLIFE', 'EVENTS', 'WORKSHOPS', 'SHOPPING'];
  if (valid.includes(r as Category)) return r as Category;
  return 'HIDDEN_GEMS';
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

const CITY_STATE: Record<string, string> = {
  'mumbai': 'Maharashtra', 'thane': 'Maharashtra', 'navi mumbai': 'Maharashtra',
  'powai': 'Maharashtra', 'panvel': 'Maharashtra', 'kalyan-dombivli': 'Maharashtra',
  'kanjur marg': 'Maharashtra', 'jaipur': 'Rajasthan', 'ahmedabad': 'Gujarat',
};

async function main() {
  // Step 1: Extract JSON from the TS file
  const tsPath = path.resolve(__dirname, '../../frontend/src/lib/experiences-data.ts');
  console.log('Reading:', tsPath);
  const content = fs.readFileSync(tsPath, 'utf-8');
  
  // Remove the interface and export prefix, keep just the array
  // Find "export const ALL_EXPERIENCES: ExperienceData[] = ["
  const marker = 'ALL_EXPERIENCES';
  const idx = content.indexOf(marker);
  if (idx === -1) throw new Error('Cannot find ALL_EXPERIENCES');
  
  // Find the opening bracket
  const openBracket = content.indexOf('[', idx);
  if (openBracket === -1) throw new Error('Cannot find opening bracket');
  
  // Read from the bracket to end-of-file, trim the trailing ";", newlines etc
  let arrayStr = content.substring(openBracket).trim();
  // Cut at the last closing bracket of the array (before any trailing exports)
  const lastBracket = arrayStr.lastIndexOf('];');
  if (lastBracket !== -1) {
    arrayStr = arrayStr.substring(0, lastBracket + 1);
  }
  arrayStr = arrayStr.replace(/;\s*$/, '').trim();
  
  console.log(`Array string length: ${arrayStr.length} chars`);
  console.log(`First 100 chars: ${arrayStr.substring(0, 100)}`);
  console.log(`Last 100 chars: ${arrayStr.substring(arrayStr.length - 100)}`);
  
  // Parse using Function constructor (safe - we control the source)
  let experiences: any[];
  try {
    experiences = new Function(`return ${arrayStr}`)();
  } catch(e: any) {
    console.error('Parse error:', e.message);
    // Try writing to file and checking
    const debugPath = path.resolve(__dirname, 'debug-array.txt');
    fs.writeFileSync(debugPath, arrayStr.substring(0, 1000) + '\n...\n' + arrayStr.substring(arrayStr.length - 1000));
    console.log(`Debug written to ${debugPath}`);
    process.exit(1);
  }
  
  console.log(`Parsed ${experiences.length} experiences`);

  // Get provider
  const existingProvider = await prisma.providerProfile.findFirst({
    where: { businessName: { contains: 'Curated Dataset' } },
  });
  if (!existingProvider) throw new Error('No provider found - run import-dataset.ts first');
  const providerId = existingProvider.id;
  console.log(`Using provider: ${existingProvider.businessName} (${providerId})`);

  // Get existing
  const existing = await prisma.experience.findMany({ select: { id: true, title: true, city: true } });
  const existingById = new Set(existing.map(e => e.id));
  const existingByKey = new Set(existing.map(e => `${e.title}||${e.city}`));
  console.log(`DB has ${existing.length} experiences`);

  let inserted = 0, updated = 0, skipped = 0;

  for (const exp of experiences) {
    const title = exp.title || exp.name || '';
    const city = exp.city || '';
    if (!title || !city) { skipped++; continue; }

    const category = mapCategory(exp.category || '');
    const priceMin = exp.priceMin ?? 0;
    const priceMax = exp.priceMax ?? priceMin;
    const budgetBand = mapBudgetBand(priceMin, priceMax);
    const lat = exp.candidateLat || 19.076;
    const lng = exp.candidateLng || 72.877;
    const state = CITY_STATE[city.toLowerCase()] || 'India';
    const area = exp.area || '';
    const durationMinutes = exp.durationMinutes || 90;
    const ratingAverage = exp.ratingAverage || 4.5;
    const authenticityRating = exp.authenticityRating || exp.authenticityScore || 0.9;
    const mediaUrls = exp.mediaUrls || [];
    const weatherTag = mapWeatherTag(exp.vibe);
    const description = exp.description || `${title} in ${area}, ${city}.`;
    
    const metadata: Record<string, any> = {};
    if (exp.humanTip) metadata.humanTip = exp.humanTip;
    if (exp.bestTime) metadata.bestTime = exp.bestTime;
    if (exp.bestFor) metadata.bestFor = exp.bestFor;
    if (exp.vibe) metadata.vibe = exp.vibe;
    if (exp.tags) metadata.tags = exp.tags;
    if (exp.operatingHours) metadata.operatingHours = exp.operatingHours;
    if (exp.closedDays) metadata.closedDays = exp.closedDays;
    if (exp.bookingType) metadata.bookingType = exp.bookingType;
    if (exp.mustTry) metadata.mustTry = exp.mustTry;
    if (exp.accessibilityNotes) metadata.accessibilityNotes = exp.accessibilityNotes;
    if (exp.cover) metadata.cover = exp.cover;
    if (exp['cover row']) metadata.coverRow = exp['cover row'];
    if (exp.categoryLabel) metadata.categoryLabel = exp.categoryLabel;
    
    const key = `${title}||${city}`;

    try {
      if (existingById.has(exp.id) || existingByKey.has(key)) {
        // Update existing
        if (existingById.has(exp.id)) {
          await prisma.experience.update({
            where: { id: exp.id },
            data: {
              area: area || undefined,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
              mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            },
          });
        } else {
          await prisma.experience.updateMany({
            where: { title, city },
            data: {
              area: area || undefined,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
              mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            },
          });
        }
        updated++;
      } else {
        // Insert
        await prisma.$queryRawUnsafe(
          `INSERT INTO "experiences" (
            "id", "provider_id", "title", "description", "category",
            "location", "latitude", "longitude", "address", "city", "state", "country",
            "price_min", "price_max", "currency", "budget_band", "accessibility_tags",
            "media_urls", "availability_rules", "duration_minutes", "weather_tag",
            "rating_average", "review_count", "authenticity_rating",
            "area", "metadata", "updated_at"
          ) VALUES (
            gen_random_uuid(), $1::uuid, $2, $3, $4::"Category",
            ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $6, $5, $7, $8, $9, 'India',
            $10, $11, 'INR', $12::"BudgetBand", $13::text[],
            $14::text[], $15::jsonb, $16, $17::"WeatherTag", $18, $19, $20,
            $21, $22::jsonb, NOW()
          )`,
          providerId, title, description, category,
          lng, lat, area, city, state,
          priceMin, priceMax, budgetBand, [],
          mediaUrls,
          JSON.stringify([{ daysOfWeek: [0,1,2,3,4,5,6], openTime: '08:00', closeTime: '20:00' }]),
          durationMinutes, weatherTag, ratingAverage,
          Math.floor(20 + Math.random() * 150),
          authenticityRating, area,
          JSON.stringify(metadata),
        );
        inserted++;
      }
      
      if ((inserted + updated) % 50 === 0) {
        console.log(`  Progress: +${inserted} new, ~${updated} updated, ${skipped} skip`);
      }
    } catch (err: any) {
      console.warn(`  Error "${title}": ${err.message?.slice(0, 120)}`);
      skipped++;
    }
  }

  const finalCount = await prisma.experience.count();
  console.log(`\nDone! +${inserted} new, ~${updated} updated, ${skipped} skipped`);
  console.log(`Total experiences in DB: ${finalCount}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
