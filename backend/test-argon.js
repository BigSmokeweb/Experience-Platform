const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const argon2 = require('argon2');

async function checkHash() {
  const user = await prisma.user.findUnique({ where: { email: 'kunalwaghmare2005@gmail.com' } });
  console.log('Password hash format:', user.passwordHash?.substring(0, 30));
  console.log('Valid hash length:', user.passwordHash?.length);
  try {
    const isV = await argon2.verify(user.passwordHash, 'test');
    console.log('Argon2 verify completed without crash:', isV);
  } catch (e) {
    console.error('Argon2 verify crashed:', e);
  }
}

checkHash().catch(console.error).finally(() => prisma.$disconnect());
