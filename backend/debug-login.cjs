const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== Login Debug ===\n');
  
  // Check Peter's role in DB
  const peter = await p.user.findFirst({ where: { email: 'peter.philipp@web.de' } });
  if (peter) {
    console.log('Peter in DB:', JSON.stringify(peter, null, 2));
  } else {
    console.log('❌ Peter nicht gefunden!');
  }
  
  // Check all users
  const users = await p.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log('\nAlle Users:', JSON.stringify(users, null, 2));
  
  // Check shifts for tournament 1
  const shifts = await p.shift.count({ where: { tournamentId: 1 } });
  console.log(`\nShifts für Tournament 1: ${shifts}`);
  
  // Check workAreas
  const workAreas = await p.workArea.findMany();
  console.log('WorkAreas:', JSON.stringify(workAreas, null, 2));
  
  // Check globalTimeSlots
  const timeSlots = await p.globalTimeSlot.findMany();
  console.log('GlobalTimeSlots:', JSON.stringify(timeSlots, null, 2));
  
  await p.$disconnect();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
