const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function checkDiff() {
  try {
    const raw = fs.readFileSync('C:\\Users\\Kunal\\Downloads\\catalog-dataset.no-images.json', 'utf8');
    const newItems = JSON.parse(raw);

    const rows = await prisma.$queryRawUnsafe('SELECT name FROM storage.objects WHERE bucket_id = \'catalog-images\';');
    const existingInBucket = new Set(rows.map(r => r.name));
    console.log('Total existing objects in storage bucket:', existingInBucket.size);

    let referenced = new Set();
    for (const item of newItems) {
      if (item.cover) {
        const c = item.cover.replace(/^\//, '').replace(/^catalog-images\//, '');
        referenced.add(c);
      }
      for (const m of (item.mediaUrls || [])) {
        const u = m.replace(/^\//, '').replace(/^catalog-images\//, '');
        referenced.add(u);
      }
    }
    console.log('Unique images referenced in new dataset:', referenced.size);

    let missingInBucket = [];
    for (const r of referenced) {
      if (!existingInBucket.has(r)) {
        missingInBucket.push(r);
      }
    }
    console.log('Referenced images missing from storage bucket:', missingInBucket.length);
    if (missingInBucket.length > 0) {
      console.log('Sample missing:', missingInBucket.slice(0, 10));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDiff();
