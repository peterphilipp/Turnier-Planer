import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const day = await prisma.$transaction(async (tx) => {
    const d = await tx.tournamentDay.create({
      data: { tournamentId: 1, date: new Date('2026-09-07T00:00:00Z'), label: 'Test', order: 3, sourceTemplateId: 3 }
    });
    const slots = await tx.globalDaySlot.findMany({ where: { templateId: 3 }, orderBy: [{ startMin: 'asc' }] });
    if (slots.length) {
      await tx.daySlot.createMany({
        data: slots.map(s => ({
          tournamentDayId: d.id, startMin: s.startMin, endMin: s.endMin, label: s.label, color: s.color, order: s.order, sourceGlobalSlotId: s.id
        }))
      });
    }
    return d;
  });
  const full = await prisma.tournamentDay.findUnique({ where: { id: day.id }, include: { slots: true } });
  console.log(JSON.stringify(full, null, 2));
}

main();
