import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, Category, BudgetBand, WeatherTag } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mvsnmwznonupjypacswj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'catalog-images';

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SECRET_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const prisma = new PrismaClient();

const FRONTEND_PUBLIC_DIR = path.resolve(__dirname, '../../frontend/public');
const SEASONAL_DATASET_FILE = path.resolve(__dirname, '../../frontend/src/lib/seasonal-dataset.json');

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else if (entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadFile(filePath: string, storagePath: string): Promise<boolean> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const normalizedStoragePath = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(normalizedStoragePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error(`Failed to upload ${normalizedStoragePath}:`, error.message);
    return false;
  }
  return true;
}

async function uploadImages() {
  console.log('=== Step 1: Uploading Seasonal Images & Banners to Supabase Storage ===');
  
  const filesToUpload: { localPath: string; remotePath: string }[] = [];

  // 1. Seasonal Spots Images
  const seasonalImagesDir = path.join(FRONTEND_PUBLIC_DIR, 'seasonal-images');
  if (fs.existsSync(seasonalImagesDir)) {
    const images = await getAllFiles(seasonalImagesDir);
    for (const img of images) {
      const rel = path.relative(FRONTEND_PUBLIC_DIR, img);
      filesToUpload.push({ localPath: img, remotePath: rel });
    }
  }

  // 2. Banners
  const bannerImagesDir = path.join(FRONTEND_PUBLIC_DIR, 'images');
  if (fs.existsSync(bannerImagesDir)) {
    const bannerFiles = ['ganpati-banner.jpg', 'seasonal-banner.jpg'];
    for (const b of bannerFiles) {
      const bPath = path.join(bannerImagesDir, b);
      if (fs.existsSync(bPath)) {
        filesToUpload.push({ localPath: bPath, remotePath: `images/${b}` });
      }
    }
  }

  console.log(`Found ${filesToUpload.length} total images to upload to bucket '${BUCKET_NAME}'`);

  const CONCURRENCY = 10;
  let completed = 0;
  let failed = 0;
  const queue = [...filesToUpload];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const ok = await uploadFile(item.localPath, item.remotePath);
      if (ok) completed++;
      else failed++;

      if (completed % 25 === 0 || completed === filesToUpload.length) {
        console.log(`[Storage] ${completed}/${filesToUpload.length} uploaded...`);
      }
    }
  });

  await Promise.all(workers);
  console.log(`Storage upload complete! Success: ${completed}, Failed: ${failed}\n`);
}

async function pushDatabaseRecords() {
  console.log('=== Step 2: Upserting Seasonal Experiences into PostgreSQL Database ===');
  if (!fs.existsSync(SEASONAL_DATASET_FILE)) {
    console.error(`Seasonal dataset file not found: ${SEASONAL_DATASET_FILE}`);
    return;
  }

  const raw = await fs.promises.readFile(SEASONAL_DATASET_FILE, 'utf-8');
  const items = JSON.parse(raw);
  console.log(`Found ${items.length} seasonal items in dataset.`);

  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const lat = item.candidateLat || 19.076;
    const lng = item.candidateLng || 72.8777;
    const title = item.title;
    const desc = item.description || '';
    const city = item.city || 'Mumbai';
    const state = item.state || 'Maharashtra';
    const address = item.venue || `${item.eventArea || item.city}, Maharashtra`;
    const ratingAverage = Number(item.ratingAverage) || 4.9;
    const reviewCount = Number(item.reviewCount) || 50;
    const authenticityRating = Number(item.authenticityRating) || 0.95;
    const durationMinutes = Number(item.durationMinutes) || 120;
    const area = item.eventArea || item.area || item.city;
    const mediaUrls = Array.isArray(item.mediaUrls) ? item.mediaUrls : [];

    const metadata = {
      festival: item.category,
      isSeasonal: true,
      seasonalCategory: item.category,
      venue: item.venue,
      eventArea: item.eventArea,
      vibe: item.vibe,
      humanTip: item.humanTip,
      bestTime: item.bestTime,
      mustTry: item.mustTry,
      cover: item.cover,
      images: item.images,
    };

    // Category mapping: EVENTS for festive utsav/garba, CULTURE for mandals/temples
    const categoryEnum = item.category === 'Navaratri' ? Category.EVENTS : Category.CULTURE;
    const budgetBand = BudgetBand.BUDGET;
    const weatherTag = WeatherTag.WEATHER_DEPENDENT;

    try {
      // Upsert using raw SQL to handle PostGIS location geography
      const existing: any[] = await prisma.$queryRaw`
        SELECT id FROM "experiences" WHERE title = ${title} LIMIT 1
      `;

      if (existing.length > 0) {
        const id = existing[0].id;
        await prisma.$executeRaw`
          UPDATE "experiences"
          SET
            description = ${desc},
            category = ${categoryEnum}::"Category",
            latitude = ${lat},
            longitude = ${lng},
            address = ${address},
            city = ${city},
            state = ${state},
            "price_min" = 0,
            "price_max" = 0,
            "budget_band" = ${budgetBand}::"BudgetBand",
            "media_urls" = ${mediaUrls},
            "duration_minutes" = ${durationMinutes},
            "rating_average" = ${ratingAverage},
            "review_count" = ${reviewCount},
            "authenticity_rating" = ${authenticityRating},
            "weather_tag" = ${weatherTag}::"WeatherTag",
            area = ${area},
            metadata = ${JSON.stringify(metadata)}::jsonb,
            published = true,
            is_active = true,
            location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            updated_at = NOW()
          WHERE id = ${id}::uuid
        `;
        updated++;
      } else {
        await prisma.$executeRaw`
          INSERT INTO "experiences" (
            title, description, category, latitude, longitude, address,
            city, state, country, price_min, price_max, currency,
            budget_band, accessibility_tags, media_urls, availability_rules,
            duration_minutes, quality_score, rating_average, review_count,
            authenticity_rating, weather_tag, area, metadata, published,
            is_active, location, created_at, updated_at
          ) VALUES (
            ${title}, ${desc}, ${categoryEnum}::"Category", ${lat}, ${lng}, ${address},
            ${city}, ${state}, 'India', 0, 0, 'INR',
            ${budgetBand}::"BudgetBand", ARRAY[]::text[], ${mediaUrls}, '{}'::jsonb,
            ${durationMinutes}, 0.95, ${ratingAverage}, ${reviewCount},
            ${authenticityRating}, ${weatherTag}::"WeatherTag", ${area}, ${JSON.stringify(metadata)}::jsonb, true,
            true, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, NOW(), NOW()
          )
        `;
        inserted++;
      }
    } catch (dbErr: any) {
      console.error(`DB error for ${title}:`, dbErr.message);
    }
  }

  console.log(`Database sync complete! Inserted: ${inserted}, Updated: ${updated}`);
}

async function main() {
  try {
    await uploadImages();
    await pushDatabaseRecords();
    console.log('\nAll seasonal images, banners, and database records successfully synced!');
  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
