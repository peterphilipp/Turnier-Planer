const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const SECRET = 'tsv-holm-secret-2025';
  const token = jwt.sign({ volunteerId: 5 }, SECRET, { expiresIn: '7d' });
  console.log('Token:', token.substring(0, 50) + '...');
  
  const decoded = jwt.verify(token, SECRET);
  console.log('Decoded:', decoded);
  
  const volunteer = await p.volunteer.findUnique({ where: { id: decoded.volunteerId } });
  console.log('Volunteer:', volunteer?.name, 'tournamentId:', volunteer?.tournamentId);
  
  if (volunteer?.tournamentId) {
    const shifts = await p.shift.findMany({
      where: { tournamentId: volunteer.tournamentId },
      include: { zeitslot: true, arbeitsbereich: true },
      orderBy: { date: 'asc' },
    });
    console.log('Shifts:', shifts.length);
    shifts.forEach(s => console.log(' ', s.id, s.date, s.zeitslot?.name, s.arbeitsbereich?.name, s.maxVolunteers));
  }
  
  await p.$disconnect();
}
main();
