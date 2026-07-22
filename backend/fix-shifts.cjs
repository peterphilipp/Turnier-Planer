const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Setze zeitslotId auf alle Schichten die keine haben
  const unassigned = await p.shift.findMany({
    where: { zeitslotId: null },
    select: { id: true, date: true },
  });
  
  console.log('Schichten ohne Zeitslot:', unassigned.length);
  
  // Weise basierend auf Uhrzeit einen Zeitslot zu
  const slots = await p.zeitslot.findMany();
  console.log('Verfügbare Zeitslots:', slots.map(s => s.name));
  
  // Simple assignment: assign Zeitslot 1 (Vormittag) to all for now
  // In production, this would be based on the shift's intended time
  for (const shift of unassigned) {
    await p.shift.update({
      where: { id: shift.id },
      data: { zeitslotId: 1 }, // Default to Vormittag
    });
  }
  
  console.log('✅ Alle Schichten haben jetzt einen Zeitslot');
  
  // Verify
  const shifts = await p.shift.findMany({
    where: { zeitslotId: { not: null } },
    include: { zeitslot: true },
    take: 5,
  });
  shifts.forEach(s => console.log(s.id, s.date, s.zeitslot.name));
  
  await p.$disconnect();
}
main();
