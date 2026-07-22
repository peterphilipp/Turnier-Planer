const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Erstelle default Jahrgänge...');
  
  const defaults = [
    { name: 'Jahrgang 2013', birthYearStart: 2013, birthYearEnd: 2013, order: 1 },
    { name: 'Jahrgang 2014', birthYearStart: 2014, birthYearEnd: 2014, order: 2 },
    { name: 'Jahrgang 2015', birthYearStart: 2015, birthYearEnd: 2015, order: 3 },
    { name: 'Jahrgang 2016', birthYearStart: 2016, birthYearEnd: 2016, order: 4 },
    { name: 'Jahrgang 2017', birthYearStart: 2017, birthYearEnd: 2017, order: 5 },
    { name: 'Jahrgang 2018', birthYearStart: 2018, birthYearEnd: 2018, order: 6 },
    { name: 'Jahrgang 2019', birthYearStart: 2019, birthYearEnd: 2019, order: 7 },
    { name: 'Jahrgang 2020', birthYearStart: 2020, birthYearEnd: 2020, order: 8 },
    { name: 'Jahrgang 2021', birthYearStart: 2021, birthYearEnd: 2021, order: 9 },
    { name: 'Jahrgang 2022', birthYearStart: 2022, birthYearEnd: 2022, order: 10 },
    { name: 'Jahrgang 2023', birthYearStart: 2023, birthYearEnd: 2023, order: 11 },
    { name: 'Jahrgang 2024', birthYearStart: 2024, birthYearEnd: 2024, order: 12 },
    { name: 'Jahrgang 2025', birthYearStart: 2025, birthYearEnd: 2025, order: 13 },
    { name: 'Jahrgang 2026', birthYearStart: 2026, birthYearEnd: 2026, order: 14 },
  ];
  
  for (const d of defaults) {
    const existing = await prisma.yearGroup.findFirst({ where: { name: d.name } });
    if (!existing) {
      await prisma.yearGroup.create({ data: { ...d, isActive: true } });
      console.log(`  ✅ ${d.name}`);
    } else {
      console.log(`  ⏭️  ${d.name} existiert bereits`);
    }
  }
  
  console.log('\n✅ Seed abgeschlossen!');
}

seed()
  .catch(e => { console.error('❌ Fehler:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
