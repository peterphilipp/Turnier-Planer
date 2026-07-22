const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.findFirst();
  if (!club) {
    console.log('No club found');
    await prisma.$disconnect();
    return;
  }
  
  await prisma.club.update({
    where: { id: club.id },
    data: {
      secondaryColor: '#6c757d',
      accentColor: '#198754',
    },
  });
  console.log('Club updated with 3 colors:', club.id);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
