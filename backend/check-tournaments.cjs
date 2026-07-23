const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    include: { club: true, yearGroup: true }
  });
  
  console.log('📋 Aktuelle Turniere:\n');
  tournaments.forEach(t => {
    console.log(`[${t.id}] ${t.name}`);
    console.log(`   📅 ${new Date(t.startDate).toLocaleDateString('de-DE')} → ${new Date(t.endDate).toLocaleDateString('de-DE')}`);
    console.log(`   Status: ${t.status} | Modus: ${t.turnierModus}`);
    console.log(`   Verein: ${t.club?.name || 'keine'} | Jahrgang: ${t.yearGroup?.name || 'keiner'}`);
    console.log();
  });
  
  const count = await prisma.tournament.count();
  console.log(`Gesamt: ${count} Turniere`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
