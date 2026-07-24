const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAll() {
  console.log('🌱 Starte umfassenden Seed...\n');

  // ── 1. Arbeitsbereiche (WorkAreas) ───────────────────────────────
  const workAreas = [
    { name: 'Verkaufsstand', icon: '🏪', minVolunteers: 3, maxVolunteers: 8, color: '#3b98f8' },
    { name: 'Küche', icon: '🍳', minVolunteers: 3, maxVolunteers: 10, color: '#e74c3c' },
    { name: 'Grillstand', icon: '🔥', minVolunteers: 3, maxVolunteers: 8, color: '#e67e22' },
    { name: 'Pfandrückgabe', icon: '🥤', minVolunteers: 2, maxVolunteers: 6, color: '#27ae60' },
    { name: 'Hüpfburg', icon: '🏰', minVolunteers: 2, maxVolunteers: 6, color: '#8e44ad' },
    { name: 'Torschussradar', icon: '🎯', minVolunteers: 2, maxVolunteers: 6, color: '#f39c12' },
    { name: 'Fußballdart', icon: '⚽', minVolunteers: 2, maxVolunteers: 6, color: '#1abc9c' },
    { name: 'Essen/Tee/Kuchen/Muffins', icon: '🍰', minVolunteers: 3, maxVolunteers: 8, color: '#2c3e50' },
  ];

  let areaCount = 0;
  for (const a of workAreas) {
    const existing = await prisma.workArea.findFirst({ where: { name: a.name } });
    if (!existing) {
      await prisma.workArea.create({ data: a });
      console.log(`  ✅ Arbeitsbereich: ${a.name}`);
      areaCount++;
    } else {
      console.log(`  ⏭️  Arbeitsbereich existiert: ${a.name}`);
    }
  }

  // ── 2. Zeit-Slots (GlobalTimeSlots) ─────────────────────────────
  const timeSlots = [
    { name: '09:00 – 10:30', startTime: '09:00', endTime: '10:30', color: '#3b98f8', order: 1 },
    { name: '10:45 – 12:15', startTime: '10:45', endTime: '12:15', color: '#27ae60', order: 2 },
    { name: '12:30 – 14:00', startTime: '12:30', endTime: '14:00', color: '#e67e22', order: 3 },
    { name: '14:15 – 15:45', startTime: '14:15', endTime: '15:45', color: '#8e44ad', order: 4 },
    { name: '16:00 – 17:30', startTime: '16:00', endTime: '17:30', color: '#e74c3c', order: 5 },
    { name: 'Pause / Mittagspause', startTime: '12:00', endTime: '12:30', color: '#95a5a6', order: 6 },
    { name: 'Finale / Abschluss', startTime: '17:00', endTime: '18:00', color: '#f39c12', order: 7 },
  ];

  let slotCount = 0;
  for (const s of timeSlots) {
    const existing = await prisma.globalTimeSlot.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.globalTimeSlot.create({ data: s });
      console.log(`  ✅ Zeitslot: ${s.name}`);
      slotCount++;
    } else {
      console.log(`  ⏭️  Zeitslot existiert: ${s.name}`);
    }
  }

  // ── 3. Jahrgänge (YearGroups) ───────────────────────────────────
  const yearGroups = [
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

  let ygCount = 0;
  for (const y of yearGroups) {
    const existing = await prisma.yearGroup.findFirst({ where: { name: y.name } });
    if (!existing) {
      await prisma.yearGroup.create({ data: { ...y, isActive: true } });
      console.log(`  ✅ Jahrgang: ${y.name}`);
      ygCount++;
    } else {
      console.log(`  ⏭️  Jahrgang existiert: ${y.name}`);
    }
  }

  // ── 4. Lebensmittel-Kategorien & Artikel (FoodCategory/FoodItem) ─
  const foodData = [
    { name: 'Kuchen', icon: '🍰', order: 1, items: ['Schwarzwälder Kirschtorte', 'Zitronenkuchen', 'Rührkuchen', 'Apfelkuchen', 'Marmorkuchen', 'Sonstiger Kuchen'] },
    { name: 'Gebäck', icon: '🥐', order: 2, items: ['Laugenstangen', 'Brezeln', 'Laugenbrötchen', 'Croissants', 'Semmel', 'Sonstiges Gebäck'] },
    { name: 'Süßes', icon: '🍪', order: 3, items: ['Muffins', 'Kaffeesonne', 'Schokoriegel', 'Gummibärchen', 'Kekse', 'Sonstiges Süßes'] },
    { name: 'Getränke', icon: '🥤', order: 4, items: ['Wasser 0.5L', 'Wasser 1L', 'Apfelsaft', 'Cola/Fanta', 'Eistee', 'Sonstiges Getränk'] },
    { name: 'Kaffee & Tee', icon: '☕', order: 5, items: ['Kaffee (Liter)', 'Tee (Beutel)', 'Heißgetränke-Mix', 'Sonstiges Kaffee & Tee'] },
  ];

  let catCount = 0;
  let itemCount = 0;
  for (const fd of foodData) {
    const existingCat = await prisma.foodCategory.findFirst({ where: { name: fd.name } });
    if (!existingCat) {
      await prisma.foodCategory.create({ data: { name: fd.name, icon: fd.icon, order: fd.order } });
      console.log(`  ✅ Kategorie: ${fd.name}`);
      catCount++;
    } else {
      console.log(`  ⏭️  Kategorie existiert: ${fd.name}`);
    }

    for (const itemName of fd.items) {
      const existingItem = await prisma.foodItem.findFirst({ where: { name: itemName, categoryId: fd.order } });
      if (!existingItem) {
        await prisma.foodItem.create({ data: { name: itemName, categoryId: fd.order, unit: 'Stk' } });
        itemCount++;
      }
    }
  }

  // ── Zusammenfassung ─────────────────────────────────────────────
  const totalAreas = await prisma.workArea.count();
  const totalSlots = await prisma.globalTimeSlot.count();
  const totalYGs = await prisma.yearGroup.count();
  const totalCats = await prisma.foodCategory.count();
  const totalItems = await prisma.foodItem.count();

  console.log(`\n📊 Ergebnis:`);
  console.log(`   Arbeitsbereiche: ${totalAreas} (${areaCount} neu)`);
  console.log(`   Zeitslots:       ${totalSlots} (${slotCount} neu)`);
  console.log(`   Jahrgänge:       ${totalYGs} (${ygCount} neu)`);
  console.log(`   Lebensmittel-Kat.: ${totalCats} (${catCount} neu)`);
  console.log(`   Lebensmittel-Art.: ${totalItems} (${itemCount} neu)`);
  console.log('\n✅ Seed abgeschlossen!\n');
}

seedAll()
  .catch(e => { console.error('❌ Fehler:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
