const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (e) {
  try {
    PrismaClient = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client')).PrismaClient;
  } catch (err) {}
}

const EXCLUDED_CITIES = new Set(['jaipur', 'ahmedabad']);

function isSeasonalItem(e) {
  return Boolean(
    e.isSeasonal === true ||
    e.metadata?.isSeasonal === true ||
    (typeof e.id === 'string' && e.id.startsWith('seasonal-')) ||
    e.category === 'Diwali' ||
    e.category === 'Ganesh Chaturthi' ||
    e.category === 'Navaratri' ||
    e.metadata?.festival ||
    e.metadata?.seasonalCategory ||
    (Array.isArray(e.tags) && e.tags.includes('seasonal'))
  );
}

const MANUAL_ALIASES = {
  'colaba causeway street shopping': 'Walk the Colaba Causeway markets',
  'crawford market local food walk': 'Explore Crawford Market',
  'chor bazaar vintage hunt': 'Walk through Chor Bazaar',
  'fort heritage architecture walk': 'Heritage walk around Fort',
  'gateway of india & colaba walk': 'Gateway of India sunset',
  'marine drive sunset walk': 'Marine Drive sunset walk',
  'bandra bandstand sunset walk': 'Bandra Bandstand sunset',
  'bandra fort photography stop': 'Bandra Fort exploration',
  'bandra street art hunt': 'Bandra street-art walk',
  'bandra café hopping': 'Bandra café-hopping',
  'juhu beach sunset & street food': 'Juhu Beach evening',
  'kanheri caves forest exploration': 'Kanheri Caves exploration',
  'sanjay gandhi national park nature trail': 'Sanjay Gandhi National Park nature walk',
  'elephanta caves day experience': 'Elephanta Caves day trip',
  'sewri flamingo watching': 'Sewri flamingo/bird watching',
  'khotachiwadi heritage lane walk': 'Khotachiwadi heritage lane walk',
  'banganga tank heritage experience': 'Banganga Tank heritage walk',
  'dr bhau daji lad museum experience': 'Dr Bhau Daji Lad Museum',
  'dhobi ghat local life experience': 'Mahalaxmi Dhobi Ghat viewpoint',
  'haji ali coastal visit': 'Haji Ali area walk',
  'powai lake evening': 'Powai lake sunset',
  'mumbai local train city experience': 'Mumbai local train experience',
  'upvan lake': 'Upvan Lake evening walk',
  'talao pali (masunda lake)': 'Talao Pali evening stroll',
  'kachrali talav': 'Kachrali Lake morning walk',
  'shree kopineshwar temple': 'Kopineshwar Temple visit',
  'ghodbunder fort': 'Ghodbunder Fort exploration',
  'jewel of navi mumbai (jnm)': 'Jewel of Navi Mumbai sunrise walk',
  'wonders park': 'Wonders Park visit',
  'gadeshwar dam': 'Gadeshwar Dam & lake outing',
  'kharghar hills viewing platform': 'Kharghar Hills trek (near Panvel)',
  'central park, kharghar': 'Central Park nature walk (Kharghar)',
  'belapur fort': 'Belapur Fort heritage visit',
  'girgaon chowpatty snack evening': 'Chowpatty street-food evening',
  'sassoon dock fishermen experience': 'Sassoon Dock fish market walk',
  'aarey green trail': 'Aarey forest nature walk',
  'secret irani cafes & art deco architecture walk': 'Mumbai Irani café experience'
};

function norm(s) {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-–—/\\()&,]/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseBudgetNumbers(b) {
  if (!b || b.toLowerCase() === 'free') return { min: 0, max: 0, band: 'BUDGET' };
  const nums = b.replace(/,/g, '').match(/\d+/g);
  if (!nums) return { min: 0, max: 0, band: 'BUDGET' };
  const p = nums.map(Number);
  const min = Math.min(...p);
  const max = Math.max(...p);
  const mid = (min + max) / 2;
  let band = 'BUDGET';
  if (mid > 3000) band = 'LUXURY';
  else if (mid > 1000) band = 'PREMIUM';
  else if (mid > 300) band = 'MODERATE';
  return { min, max, band };
}

async function main() {
  const excelPath = path.resolve(__dirname, '../Experiences_Price_Ratings.xlsx');
  const catalogPath = path.resolve(__dirname, '../frontend/src/lib/catalog-dataset.json');

  const wb = xlsx.readFile(excelPath);
  const sheet = wb.Sheets['All Experiences'] || wb.Sheets[wb.SheetNames[0]];
  const excelRows = xlsx.utils.sheet_to_json(sheet);

  const excelByNorm = new Map();
  for (const r of excelRows) {
    excelByNorm.set(norm(r['Local Experience']), r);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  let prisma = null;
  if (PrismaClient) {
    try {
      prisma = new PrismaClient();
    } catch (_) {}
  }

  const catalogMap = new Map(catalog.map(c => [c.id, c]));

  // Explore listings
  const exploreListings = catalog.filter(e => !EXCLUDED_CITIES.has(e.city?.toLowerCase()) && !isSeasonalItem(e));

  let updatedCount = 0;
  let noChangeCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const exp of exploreListings) {
    const title = exp.title || exp.name || 'Unknown';
    const nTitle = norm(title);

    try {
      let r = excelByNorm.get(nTitle);
      if (!r) {
        const alias = MANUAL_ALIASES[title.toLowerCase()];
        if (alias) r = excelByNorm.get(norm(alias));
      }

      if (!r) {
        skippedCount++;
        console.log(`[SKIP]     ${title.padEnd(45)} | Not found in dataset`);
        continue;
      }

      const rawBudget = r['Budget'];
      if (!rawBudget || String(rawBudget).trim() === '') {
        skippedCount++;
        console.log(`[SKIP]     ${title.padEnd(45)} | Dataset value missing — skipped`);
        continue;
      }

      const budget = String(rawBudget).trim();
      const isBudgetFree = budget.toLowerCase() === 'free';
      const isCurrentFree =
        exp.budget?.toLowerCase() === 'free' ||
        ((!exp.priceMin && !exp.priceMax) || (exp.priceMin === 0 && exp.priceMax === 0));

      if (isBudgetFree && isCurrentFree) {
        noChangeCount++;
        console.log(`[NO CHANGE] ${title.padEnd(45)} | Price already correct: Free`);
        continue;
      }

      if (exp.budget === budget) {
        noChangeCount++;
        console.log(`[NO CHANGE] ${title.padEnd(45)} | Price already correct: ${budget}`);
        continue;
      }

      // Update in catalog
      const parsed = parseBudgetNumbers(budget);
      exp.budget = budget;
      exp.price = budget;
      exp.priceMin = parsed.min;
      exp.priceMax = parsed.max;
      exp.budgetBand = parsed.band;
      if (!exp.metadata) exp.metadata = {};
      exp.metadata.budget = budget;
      exp.metadata.price = budget;

      // Update in DB if prisma connected
      if (prisma && exp.id) {
        try {
          const existingDb = await prisma.experience.findUnique({ where: { id: exp.id } });
          if (existingDb) {
            const currentMeta = (existingDb.metadata && typeof existingDb.metadata === 'object') ? existingDb.metadata : {};
            await prisma.experience.update({
              where: { id: exp.id },
              data: {
                priceMin: parsed.min,
                priceMax: parsed.max,
                budgetBand: parsed.band,
                metadata: {
                  ...currentMeta,
                  budget,
                  price: budget,
                },
              },
            });
          }
        } catch (dbErr) {
          // Soft error logging for DB if not matching
        }
      }

      updatedCount++;
      console.log(`[UPDATED]  ${title.padEnd(45)} | Price set to: ${budget}`);
    } catch (err) {
      errorCount++;
      console.log(`[ERROR]    ${title.padEnd(45)} | Could not update — manual review needed`);
    }
  }

  // Write updated catalog dataset back to disk
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

  if (prisma) {
    await prisma.$disconnect();
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`Total: ${exploreListings.length} | Updated: ${updatedCount} | No Change: ${noChangeCount} | Skipped: ${skippedCount} | Errors: ${errorCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
