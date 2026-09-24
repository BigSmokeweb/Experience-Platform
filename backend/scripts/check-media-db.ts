import { PrismaClient } from '@prisma/media-client';

const prisma = new PrismaClient();

async function check() {
  try {
    const buckets: any = await prisma.$queryRawUnsafe('SELECT id, name, public FROM storage.buckets;');
    console.log('BUCKETS:', JSON.stringify(buckets));
  } catch (e: any) {
    console.log('Buckets query error:', e.message);
  }

  try {
    const asset = await prisma.mediaAsset.findFirst();
    console.log('EXISTING_ASSET:', JSON.stringify(asset, null, 2));
  } catch (e: any) {
    console.log('Error finding asset:', e.message);
  }

  try {
    const instances: any = await prisma.$queryRawUnsafe(`SELECT * FROM auth.instances;`);
    console.log('AUTH INSTANCES:', JSON.stringify(instances, null, 2));
  } catch (e: any) {
    console.log('Instances error:', e.message);
  }

  await prisma.$disconnect();
}

check();
