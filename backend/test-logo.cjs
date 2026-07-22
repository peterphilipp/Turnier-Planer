const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.findFirst();
  if (!club) {
    console.log('No club found');
    await prisma.$disconnect();
    return;
  }
  console.log('Club:', club.id, club.name);
  console.log('Logo stored:', club.logo ? 'YES (' + club.logo.length + ' bytes)' : 'NO');
  if (club.logo) {
    console.log('First 100 chars:', club.logo.substring(0, 100));
  }
  
  // Test update with logo
  const testLogo = 'data:image/png;base64,iVBORw0KGgo=';
  const updated = await prisma.club.update({
    where: { id: club.id },
    data: { logo: testLogo },
  });
  console.log('After update - Logo stored:', updated.logo ? 'YES (' + updated.logo.length + ' bytes)' : 'NO');
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
