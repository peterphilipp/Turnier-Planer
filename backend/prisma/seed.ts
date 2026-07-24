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
  { name: "Verkaufsstand", icon: "🏪", minVolunteers: 1, maxVolunteers: 3, color: "#0d6efd" },
  { name: "Küche", icon: "☕", minVolunteers: 1, maxVolunteers: 3, color: "#e74c3c" },
  { name: "Grillstand", icon: "🔥", minVolunteers: 1, maxVolunteers: 3, color: "#e67e22" },
  { name: "Pfandrückgabe", icon: "📦", minVolunteers: 1, maxVolunteers: 2, color: "#27ae60" },
  { name: "Hüpfburg", icon: "🎪", minVolunteers: 1, maxVolunteers: 2, color: "#8e44ad" },
  { name: "Torschussradar", icon: "🎯", minVolunteers: 1, maxVolunteers: 2, color: "#f39c12" },
  { name: "Fußballdart", icon: "⚽", minVolunteers: 1, maxVolunteers: 2, color: "#1abc9c" },
  { name: "Essen/Tee/Kuchen/Muffins", icon: "🍰", minVolunteers: 1, maxVolunteers: 3, color: "#2c3e50" },
  { name: "Aufbau/Abbau", icon: "🔧", minVolunteers: 2, maxVolunteers: 8, color: "#3b98f8" },
  { name: "Fußballgolf", icon: "⚽", minVolunteers: 1, maxVolunteers: 2, color: "#3b98f8" },
  { name: "Springer", icon: "✅", minVolunteers: 1, maxVolunteers: 2, color: "#3b98f8" }
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
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
