const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Aktives Turnier finden
  const activeTournament = await prisma.tournament.findFirst({
    where: { status: 'aktiv' },
    orderBy: { startDate: 'desc' }
  });

  if (!activeTournament) {
    console.log('❌ Kein aktives Turnier gefunden.');
    process.exit(1);
  }

  console.log(`📋 Aktives Turnier: ${activeTournament.name} (ID: ${activeTournament.id})`);

  // Alle Helfer ohne Turnier finden
  const volunteersWithoutTournament = await prisma.user.findMany({
    where: {
      tournamentId: null,
      email: { not: null }
    }
  });

  if (volunteersWithoutTournament.length === 0) {
    console.log('✅ Alle Helfer haben bereits ein Turnier zugewiesen.');
    return;
  }

  console.log(`\n🔄 Weise ${volunteersWithoutTournament.length} Helfer(n) zu:`);

  let count = 0;
  for (const vol of volunteersWithoutTournament) {
    await prisma.user.update({
      where: { id: vol.id },
      data: { tournamentId: activeTournament.id }
    });
    console.log(`  ✅ ${vol.name} (${vol.email}) → ${activeTournament.name}`);
    count++;
  }

  console.log(`\n✅ ${count} Helfer erfolgreich zugewiesen.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
