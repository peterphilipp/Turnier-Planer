import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const foodCategories = [
  {
    name: "Kuchen",
    icon: "🍰",
    order: 1,
    items: [
      { name: "Käsekuchen", unit: "Stk" },
      { name: "Zitronenkuchen", unit: "Stk" },
      { name: "Rührkuchen", unit: "Stk" },
      { name: "Apfelkuchen", unit: "Stk" },
      { name: "Marmorkuchen", unit: "Stk" },
      { name: "Sonstiger Kuchen", unit: "Stk" }
    ]
  },
  {
    name: "Gebäck",
    icon: "🥐",
    order: 2,
    items: [
      { name: "Laugenstangen", unit: "Stk" },
      { name: "Brezeln", unit: "Stk" },
      { name: "Laugenbrötchen", unit: "Stk" },
      { name: "Croissants", unit: "Stk" },
      { name: "Semmel", unit: "Stk" },
      { name: "Sonstiges Gebäck", unit: "Stk" }
    ]
  },
  {
    name: "Süßes",
    icon: "🍪",
    order: 3,
    items: [
      { name: "Muffins", unit: "Stk" },
      { name: "Kaffeesonne", unit: "Stk" },
      { name: "Schokoriegel", unit: "Stk" },
      { name: "Gummibärchen", unit: "Tüte" },
      { name: "Kekse", unit: "Stk" },
      { name: "Sonstiges Süßes", unit: "Stk" }
    ]
  },
  {
    name: "Getränke",
    icon: "🥤",
    order: 4,
    items: [
      { name: "Wasser 0.5L", unit: "Stk" },
      { name: "Wasser 1L", unit: "Stk" },
      { name: "Apfelsaft", unit: "L" },
      { name: "Cola/Fanta", unit: "L" },
      { name: "Eistee", unit: "L" },
      { name: "Sonstiges Getränk", unit: "Stk" },
      { name: "Capri-Sun", unit: "Stk" }
    ]
  },
  {
    name: "Kaffee & Tee",
    icon: "☕",
    order: 5,
    items: [
      { name: "Kaffee (Liter)", unit: "L" },
      { name: "Tee (Beutel)", unit: "Stk" },
      { name: "Heißgetränke-Mix", unit: "Set" },
      { name: "Sonstiges Kaffee & Tee", unit: "Stk" }
    ]
  }
];

const workAreas = [
  { name: "Verkaufsstand", icon: "🏪", minVolunteers: 1, maxVolunteers: 3, color: "#0d6efd", operatingStartMin: 540, operatingEndMin: 1020 },
  { name: "Küche", icon: "☕", minVolunteers: 1, maxVolunteers: 3, color: "#e74c3c", operatingStartMin: 480, operatingEndMin: 1020 },
  { name: "Grillstand", icon: "🔥", minVolunteers: 1, maxVolunteers: 3, color: "#e67e22", operatingStartMin: 600, operatingEndMin: 1020 },
  { name: "Pfandrückgabe", icon: "📦", minVolunteers: 1, maxVolunteers: 2, color: "#27ae60" },
  { name: "Hüpfburg", icon: "🎪", minVolunteers: 1, maxVolunteers: 2, color: "#8e44ad" },
  { name: "Torschussradar", icon: "🎯", minVolunteers: 1, maxVolunteers: 2, color: "#f39c12" },
  { name: "Fußballdart", icon: "⚽", minVolunteers: 1, maxVolunteers: 2, color: "#1abc9c" },
  { name: "Essen/Tee/Kuchen/Muffins", icon: "🍰", minVolunteers: 1, maxVolunteers: 3, color: "#2c3e50" },
  { name: "Aufbau/Abbau", icon: "🔧", minVolunteers: 2, maxVolunteers: 8, color: "#3b98f8" },
  { name: "Fußballgolf", icon: "⚽", minVolunteers: 1, maxVolunteers: 2, color: "#3b98f8" },
  { name: "Springer", icon: "✅", minVolunteers: 1, maxVolunteers: 2, color: "#3b98f8" }
];

// Tag-Vorlagen-Katalog (Zeiten in Minuten seit Mitternacht: 540 = 09:00)
const dayTemplates = [
  {
    name: 'Aufbautag',
    slots: [
      { startMin: 480, endMin: 720, label: 'Vormittag', areas: ['Aufbau/Abbau'] },
      { startMin: 780, endMin: 960, label: 'Nachmittag', areas: ['Aufbau/Abbau'] }
    ]
  },
  {
    name: 'Turniertag Standard',
    slots: [
      { startMin: 540, endMin: 780, label: 'Vormittag', areas: ['Verkaufsstand', 'Küche', 'Grillstand', 'Pfandrückgabe'] },
      { startMin: 780, endMin: 1020, label: 'Nachmittag', areas: ['Verkaufsstand', 'Küche', 'Grillstand', 'Torschussradar'] }
    ]
  },
  {
    name: 'Abbautag',
    slots: [
      { startMin: 540, endMin: 780, label: 'Abbau', areas: ['Aufbau/Abbau', 'Pfandrückgabe'] }
    ]
  }
];

async function main() {
  console.log('Ignition Phase: Checking if seed data is needed...');

  const existingCategories = await prisma.foodCategory.count();
  if (existingCategories === 0) {
    console.log('🌱 Seeding Food Categories and Items...');
    for (const cat of foodCategories) {
      const createdCategory = await prisma.foodCategory.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          order: cat.order
        }
      });
      
      for (const item of cat.items) {
        await prisma.foodItem.create({
          data: {
            categoryId: createdCategory.id,
            name: item.name,
            unit: item.unit
          }
        });
      }
    }
    console.log('✅ Food Categories seeded.');
  } else {
    console.log(`⏩ Food Categories already exist (${existingCategories}). Skipping.`);
  }

  const existingWorkAreas = await prisma.workArea.count();
  if (existingWorkAreas === 0) {
    console.log('🌱 Seeding Work Areas...');
    for (const area of workAreas) {
      await prisma.workArea.create({
        data: area
      });
    }
    console.log('✅ Work Areas seeded.');
  } else {
    console.log(`⏩ Work Areas already exist (${existingWorkAreas}). Skipping.`);
  }

  const existingTemplates = await prisma.globalDayTemplate.count();
  if (existingTemplates === 0) {
    console.log('🌱 Seeding Day Templates...');
    const areas = await prisma.workArea.findMany();
    const areaByName = new Map(areas.map(a => [a.name, a.id] as const));
    for (const tmpl of dayTemplates) {
      const createdTemplate = await prisma.globalDayTemplate.create({ data: { name: tmpl.name } });
      let slotOrder = 0;
      for (const slot of tmpl.slots) {
        const createdSlot = await prisma.globalDaySlot.create({
          data: { templateId: createdTemplate.id, startMin: slot.startMin, endMin: slot.endMin, label: slot.label, order: slotOrder++ }
        });
        let areaOrder = 0;
        for (const areaName of slot.areas) {
          const workAreaId = areaByName.get(areaName);
          if (workAreaId) {
            await prisma.globalDaySlotWorkArea.create({
              data: { globalSlotId: createdSlot.id, workAreaId, order: areaOrder++ }
            });
          }
        }
      }
    }
    console.log('✅ Day Templates seeded.');
  } else {
    console.log(`⏩ Day Templates already exist (${existingTemplates}). Skipping.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
