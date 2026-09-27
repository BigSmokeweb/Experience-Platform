const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  const user = await prisma.user.findUnique({ where: { email: 'kunalwaghmare2005@gmail.com' } });
  console.log('User found:', user.id);
  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: 'test-hash' },
    });
    console.log('Update success:', updated.id);
  } catch (err) {
    console.error('Update failed:', err);
  }
}

testUpdate().catch(console.error).finally(() => prisma.$disconnect());
