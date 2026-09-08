import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const count = await prisma.experience.count();
    console.log(`Experiences in DB: ${count}`);
    const providers = await prisma.providerProfile.count();
    console.log(`Providers in DB: ${providers}`);
    const users = await prisma.user.count();
    console.log(`Users in DB: ${users}`);
  } catch (e: any) {
    console.error('DB Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
