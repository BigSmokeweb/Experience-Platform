const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectColumns() {
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'objects';
    `);
    console.log('Columns:', cols);
    const sample = await prisma.$queryRawUnsafe(`SELECT * FROM storage.objects LIMIT 1;`);
    console.log('Sample full row:', sample);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

inspectColumns();
