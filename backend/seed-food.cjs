const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Kategorien
  const categories = [
    { name: "Kuchen", icon: "🍰", order: 1 },
    { name: "Gebäck", icon: "🥐", order: 2 },
    { name: "Süßes", icon: "🍪", order: 3 },
    { name: "Getränke", icon: "🥤", order: 4 },
    { name: "Kaffee & Tee", icon: "☕", order: 5 },
  ];

  for (const cat of categories) {
    await prisma.foodCategory.upsert({
      where: { id: cat.order },
      update: {},
      create: { ...cat },
    });
  }

  // Artikel pro Kategorie
  const items = [
    // Kuchen
    { categoryId: 1, name: "Schwarzwälder Kirschtorte", unit: "Stk" },
    { categoryId: 1, name: "Zitronenkuchen", unit: "Stk" },
    { categoryId: 1, name: "Rührkuchen", unit: "Stk" },
    { categoryId: 1, name: "Apfelkuchen", unit: "Stk" },
    { categoryId: 1, name: "Marmorkuchen", unit: "Stk" },
    { categoryId: 1, name: "Sonstiger Kuchen", unit: "Stk" },
    // Gebäck
    { categoryId: 2, name: "Laugenstangen", unit: "Stk" },
    { categoryId: 2, name: "Brezeln", unit: "Stk" },
    { categoryId: 2, name: "Laugenbrötchen", unit: "Stk" },
    { categoryId: 2, name: "Croissants", unit: "Stk" },
    { categoryId: 2, name: "Semmel", unit: "Stk" },
    { categoryId: 2, name: "Sonstiges Gebäck", unit: "Stk" },
    // Süßes
    { categoryId: 3, name: "Muffins", unit: "Stk" },
    { categoryId: 3, name: "Kaffeesonne", unit: "Stk" },
    { categoryId: 3, name: "Schokoriegel", unit: "Stk" },
    { categoryId: 3, name: "Gummibärchen", unit: "Tüte" },
    { categoryId: 3, name: "Kekse", unit: "Stk" },
    { categoryId: 3, name: "Sonstiges Süßes", unit: "Stk" },
    // Getränke
    { categoryId: 4, name: "Wasser 0.5L", unit: "Stk" },
    { categoryId: 4, name: "Wasser 1L", unit: "Stk" },
    { categoryId: 4, name: "Apfelsaft", unit: "L" },
    { categoryId: 4, name: "Cola/Fanta", unit: "L" },
    { categoryId: 4, name: "Eistee", unit: "L" },
    { categoryId: 4, name: "Sonstiges Getränk", unit: "Stk" },
    // Kaffee & Tee
    { categoryId: 5, name: "Kaffee (Liter)", unit: "L" },
    { categoryId: 5, name: "Tee (Beutel)", unit: "Stk" },
    { categoryId: 5, name: "Heißgetränke-Mix", unit: "Set" },
    { categoryId: 5, name: "Sonstiges Kaffee & Tee", unit: "Stk" },
  ];

  for (const item of items) {
    await prisma.foodItem.upsert({
      where: { id: item.categoryId * 100 + item.name.length },
      update: {},
      create: item,
    });
  }

  console.log("✅ Food categories & items seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
