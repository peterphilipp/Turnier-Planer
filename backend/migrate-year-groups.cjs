const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starte Migration: yearGroup String → yearGroupId...');
  
  // Alle bestehenden Slots laden
  const slots = await prisma.foodDonationSlot.findMany({
    include: { tournament: true }
  });
  
  if (slots.length === 0) {
    console.log('✅ Keine Slots zum Migrieren.');
    return;
  }
  
  // Eindeutige Jahrgänge extrahieren und YearGroups erstellen
  const yearGroups = new Map();
  for (const slot of slots) {
    if (!slot.yearGroup) continue;
    if (!yearGroups.has(slot.yearGroup)) {
      // Versuche Geburtsjahr aus dem Namen zu extrahieren (z.B. "2017" → 2017-2017)
      const match = slot.yearGroup.match(/(\d{4})/);
      const birthYear = match ? parseInt(match[1]) : new Date().getFullYear() - 8;
      
      yearGroups.set(slot.yearGroup, {
        name: `Jahrgang ${slot.yearGroup}`,
        birthYearStart: birthYear,
        birthYearEnd: birthYear,
        order: parseInt(slot.yearGroup) || 0,
        isActive: true
      });
    }
  }
  
  // YearGroups erstellen
  const createdYearGroups = new Map();
  for (const [name, data] of yearGroups.entries()) {
    const yg = await prisma.yearGroup.create({
      data: data
    });
    createdYearGroups.set(name, yg.id);
    console.log(`  ✅ Jahrgang "${name}" → ID ${yg.id}`);
  }
  
  // Slots aktualisieren
  let updated = 0;
  for (const slot of slots) {
    if (!slot.yearGroup || !createdYearGroups.has(slot.yearGroup)) continue;
    
    await prisma.foodDonationSlot.update({
      where: { id: slot.id },
      data: { yearGroupId: createdYearGroups.get(slot.yearGroup) }
    });
    updated++;
  }
  
  console.log(`\n✅ Migration abgeschlossen! ${updated} Slots aktualisiert.`);
}

migrate()
  .catch(e => { console.error('❌ Fehler:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
