const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const active = await p.tournament.findFirst({ where: { status: 'aktiv' } });
  console.log('Aktives Turnier:', active?.id, active?.name);
  
  const shifts = await p.shift.count();
  console.log('Anzahl Schichten:', shifts);
  
  const testShifts = await p.shift.findMany({
    take: 3,
    include: { zeitslot: true, arbeitsbereich: true },
  });
  console.log('Test Schichten:');
  testShifts.forEach(s => console.log(' ', s.id, s.date, s.zeitslot?.name, s.arbeitsbereich?.name));
  
  const vol1 = await p.volunteer.findFirst({ where: { id: 5 } });
  console.log('\nVolunteer Peter:', vol1?.id, vol1?.name, 'tournamentId:', vol1?.tournamentId);
  
  if (vol1?.tournamentId) {
    const volShifts = await p.shift.findMany({
      where: { tournamentId: vol1.tournamentId },
      include: { zeitslot: true, arbeitsbereich: true },
    });
    console.log('Shifts für Peter:', volShifts.length);
  }
  
  await p.$disconnect();
}
main();
