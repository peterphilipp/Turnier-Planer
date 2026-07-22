const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const active = await p.tournament.findFirst({ where: { status: 'aktiv' } });
  if (!active) {
    console.log('Kein aktives Turnier gefunden');
    await p.$disconnect();
    return;
  }
  
  await p.volunteer.updateMany({
    where: { tournamentId: null },
    data: { tournamentId: active.id },
  });
  console.log('✅ Alle Volunteers mit Turnier', active.id, '(', active.name, ') verknüpft');
  
  await p.$disconnect();
}
main();
