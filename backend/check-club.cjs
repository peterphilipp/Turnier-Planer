const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clubs = await prisma.club.findMany();
  for (const c of clubs) {
    console.log('Club:', c.id, c.name, 'logo length:', c.logo?.length || 0);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
