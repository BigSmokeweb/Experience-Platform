const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const argon2 = require('argon2');

async function testPasswords() {
  const user = await prisma.user.findUnique({ where: { email: 'kunalwaghmare2005@gmail.com' } });
  const passwords = [
    'kunal123',
    'Kunal123',
    'Kunal@123',
    'kunal@123',
    'Kunal1234',
    '12345678',
    'password',
    'password123',
    'Milind@Sahu123',
    'kunalwaghmare',
    'kunalwaghmare2005',
    'Kunal@2005',
    'kunal@2005',
  ];

  for (const p of passwords) {
    const isV = await argon2.verify(user.passwordHash, p);
    if (isV) {
      console.log('MATCH FOUND:', p);
      return p;
    }
  }
  console.log('No match in common list');
}

testPasswords().catch(console.error).finally(() => prisma.$disconnect());
