const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    include: { teamA: true, teamB: true, timeSlot: true, field: true }
  });
  
  console.log(`\n=== MATCHES IN DB ===`);
  console.log(`Total: ${matches.length}\n`);
  
  matches.forEach(m => {
    console.log(`ID:${m.id} tour:${m.tournamentId} yg:${m.yearGroupId} A:${m.teamAId}(${m.teamA?.name || '?'}) B:${m.teamBId}(${m.teamB?.name || '?'}) phase:${m.phase} status:${m.status}`);
  });
  
  // Teams check
  const teams = await prisma.team.findMany({ include: { yearGroup: true } });
  console.log(`\n=== TEAMS ===`);
  teams.forEach(t => {
    console.log(`ID:${t.id} name:${t.name} tour:${t.tournamentId} yg:${t.yearGroupId}(${t.yearGroup?.name || '?'}) group:${t.groupId}`);
  });
  
  // TimeSlots check
  const slots = await prisma.timeSlot.findMany({ include: { tournament: true } });
  console.log(`\n=== TIMESLOTS ===`);
  slots.forEach(s => {
    console.log(`ID:${s.id} tour:${s.tournamentId} date:${s.date} ${s.startTime}-${s.endTime}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
