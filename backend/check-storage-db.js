const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStorage() {
  try {
    const buckets = await prisma.$queryRawUnsafe('SELECT id, name, public FROM storage.buckets;');
    console.log('Buckets:', buckets);
    const count = await prisma.$queryRawUnsafe('SELECT count(*) FROM storage.objects;');
    console.log('Objects count:', count);
    const sample = await prisma.$queryRawUnsafe('SELECT id, bucket_id, name, created_at FROM storage.objects LIMIT 5;');
    console.log('Sample objects:', sample);
    const expCount = await prisma.experience.count();
    console.log('Experiences in DB:', expCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkStorage();
