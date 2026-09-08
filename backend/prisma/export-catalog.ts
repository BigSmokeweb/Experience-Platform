import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const experiences = await prisma.experience.findMany({
    where: { isActive: true, published: true },
    orderBy: { ratingAverage: 'desc' },
    include: {
      provider: {
        select: { businessName: true, verificationStatus: true },
      },
    },
  });

  console.log(`Exporting ${experiences.length} experiences from DB...`);

  const mapped = experiences.map((exp) => {
    const meta = (exp.metadata as any) || {};
    return {
      id: exp.id,
      title: exp.title,
      description: exp.description,
      category: exp.category,
      city: exp.city,
      state: exp.state,
      area: exp.area || '',
      priceMin: exp.priceMin || 0,
      priceMax: exp.priceMax || 0,
      budgetBand: exp.budgetBand,
      durationMinutes: exp.durationMinutes || 90,
      ratingAverage: exp.ratingAverage || 4.5,
      reviewCount: exp.reviewCount || 0,
      authenticityRating: exp.authenticityRating || 0.9,
      mediaUrls: exp.mediaUrls || [],
      candidateLat: exp.latitude,
      candidateLng: exp.longitude,
      cover: meta.cover || exp.mediaUrls?.[0] || '',
      categoryLabel: meta.categoryLabel || exp.category,
      humanTip: meta.humanTip || '',
      bestTime: meta.bestTime || '',
      vibe: meta.vibe || '',
      tags: Array.isArray(meta.tags)
        ? meta.tags
        : typeof meta.tags === 'string'
        ? meta.tags.split(' ')
        : [],
      mustTry: meta.mustTry || '',
      operatingHours: meta.operatingHours || '',
      closedDays: meta.closedDays || '',
      bookingType: meta.bookingType || '',
      accessibilityNotes: meta.accessibilityNotes || '',
      bestFor: meta.bestFor || '',
      provider: exp.provider
        ? {
            businessName: exp.provider.businessName || undefined,
            verificationStatus: exp.provider.verificationStatus || undefined,
          }
        : undefined,
    };
  });

  const outPath = path.resolve(__dirname, '../../frontend/src/lib/catalog-dataset.json');
  fs.writeFileSync(outPath, JSON.stringify(mapped, null, 2));
  console.log(`Successfully wrote ${mapped.length} items to ${outPath}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
