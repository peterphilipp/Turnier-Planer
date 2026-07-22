const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tournaments = await p.tournament.findMany({ select: { id: true, name: true, startDate: true, endDate: true } });
  console.log('=== Tournaments ===');
  tournaments.forEach(t => console.log(t.id, t.name, t.startDate, t.endDate));
  
  const shifts = await p.shift.findMany({
    include: { zeitslot: true, arbeitsbereich: true },
  });
  console.log('\n=== Shifts (' + shifts.length + ') ===');
  shifts.forEach(s => console.log(s.id, s.date, s.slot, s.arbeitsbereichId, s.maxVolunteers));
  
  const zeitslots = await p.zeitslot.findMany({ select: { id: true, name: true, startTime: true, endTime: true } });
  console.log('\n=== Zeitslots (' + zeitslots.length + ') ===');
  zeitslots.forEach(s => console.log(s.id, s.name, s.startTime, s.endTime));
  
  const areas = await p.arbeitsbereich.findMany({ select: { id: true, name: true, icon: true } });
  console.log('\n=== Arbeitsbereiche (' + areas.length + ') ===');
  areas.forEach(a => console.log(a.id, a.name, a.icon));
  
  await p.$disconnect();
}
main();
