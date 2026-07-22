const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updates = [
  { id: 1, icon: '🏪' },  // Verkaufsstand
  { id: 2, icon: '🍳' },  // Küche
  { id: 4, icon: '📦' },  // Pfandrückgabe
  { id: 5, icon: '🎪' },  // Hüpfburg
  { id: 9, icon: '🔧' },  // Aufbau/Abbau
];

async function main() {
  for (const u of updates) {
    await prisma.arbeitsbereich.update({
      where: { id: u.id },
      data: { icon: u.icon },
    });
    console.log(`✅ ${u.id}: ${u.icon}`);
  }
  console.log('Fertig!');
}

main().catch(e => { console.error(e); process.exit(1); });
