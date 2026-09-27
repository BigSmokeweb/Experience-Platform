const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const argon2 = require('argon2');

async function testSimulatedLogin() {
  const user = await prisma.user.findUnique({
    where: { email: 'kunalwaghmare2005@gmail.com' },
    include: { providerProfile: true, travelerProfile: true },
  });

  console.log('Testing generateAuthTokens logic for Kunal:');
  const jwt = require('jsonwebtoken');
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, 'production-grade-super-secret-access-token-key-change-in-env', { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, 'production-grade-super-secret-refresh-token-key-change-in-env', { expiresIn: '7d' });
  const refreshTokenHash = await argon2.hash(refreshToken);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });
  console.log('Token generation and update succeeded!');
}

testSimulatedLogin().catch(console.error).finally(() => prisma.$disconnect());
