const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shifts = await prisma.shift.findMany({ where: { volunteerShifts: { none: {} } } });
  console.log('Found', shifts.length, 'shifts without VolunteerShifts');
  
  const volunteerShifts = await prisma.volunteerShift.findMany({
    where: { shiftId: null },
    include: { volunteer: true },
  });
  console.log('Found', volunteerShifts.length, 'VolunteerShifts without shiftId');
  
  let updated = 0;
  for (const vs of volunteerShifts) {
    const found = await prisma.shift.findFirst({
      where: {
        tournamentId: vs.tournamentId,
        date: vs.date,
        arbeitsbereichId: vs.areaId ? parseInt(vs.areaId) : null,
      },
    });
    if (found) {
      await prisma.volunteerShift.update({
        where: { id: vs.id },
        data: { shiftId: found.id },
      });
      updated++;
    }
  }
  console.log('Updated', updated, 'records');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
