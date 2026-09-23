import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const datasetPath = path.resolve(__dirname, '../../frontend/src/lib/catalog-dataset.json');
  const raw = fs.readFileSync(datasetPath, 'utf8');
  const dataset: any[] = JSON.parse(raw);

  console.log(`Loaded ${dataset.length} items from ${datasetPath}`);

  let updated = 0;
  let skipped = 0;

  for (const item of dataset) {
    if (!item.id) continue;
    try {
      const existing = await prisma.experience.findUnique({
        where: { id: item.id },
      });

      if (existing) {
        const currentMeta = (existing.metadata as Record<string, any>) || {};
        await prisma.experience.update({
          where: { id: item.id },
          data: {
            mediaUrls: item.mediaUrls || [],
            metadata: {
              ...currentMeta,
              cover: item.cover || (item.mediaUrls?.[0] ?? ''),
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
            },
          },
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (e: any) {
      console.error(`Error updating ${item.id}:`, e.message);
    }
  }

  console.log(`Sync complete. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
