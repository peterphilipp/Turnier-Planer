const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Club erstellen falls nicht existiert
  let club = await prisma.club.findFirst({ where: { name: 'TSV Holm' } });
  if (!club) {
    club = await prisma.club.create({
      data: {
        name: 'TSV Holm',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        accentColor: '#198754',
        logo: null,
      },
    });
    console.log('Club erstellt:', club.id);
  } else {
    console.log('Club existiert bereits:', club.id);
  }

  // Bestehende Turniere mit clubId versehen
  const tournaments = await prisma.tournament.findMany({ where: { clubId: null } });
  let updated = 0;
  for (const t of tournaments) {
    await prisma.tournament.update({
      where: { id: t.id },
      data: { clubId: club.id },
    });
    updated++;
  }
  console.log(updated, 'Turniere mit Club verknüpft');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
