const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'kunalwaghmare2005@gmail.com' },
    include: {
      travelerProfile: true,
      providerProfile: true,
      tripMemories: true,
    },
  });
  console.log('User details:', JSON.stringify(user, null, 2));
}

inspectUser().catch(console.error).finally(() => prisma.$disconnect());
