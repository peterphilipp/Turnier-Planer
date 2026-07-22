const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const volunteers = await p.volunteer.findMany({ select: { id: true, name: true, tournamentId: true } });
  console.log('=== Volunteers ===');
  volunteers.forEach(v => console.log(v.id, v.name, 'tournamentId:', v.tournamentId));
  
  const tournaments = await p.tournament.findMany({ select: { id: true, name: true } });
  console.log('\n=== Tournaments ===');
  tournaments.forEach(t => console.log(t.id, t.name));
  
  const shifts = await p.shift.findMany({ 
    include: { zeitslot: true, arbeitsbereich: true },
  });
  console.log('\n=== Shifts (' + shifts.length + ') ===');
  shifts.forEach(s => console.log(s.id, s.date, s.slot, s.arbeitsbereichId, s.maxVolunteers));
  
  await p.$disconnect();
}
main();
