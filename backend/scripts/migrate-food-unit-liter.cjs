/**
 * Einmalige Korrektur: die Einheit "L" (Liter) wurde bisher als einzelner
 * Grossbuchstabe gefuehrt - leicht mit "l" (Kleinbuchstabe, im Fliesstext kaum
 * von "1" zu unterscheiden) zu verwechseln. Die Dropdown-Liste in Lebensmittel.tsx
 * bietet jetzt nur noch "Liter" (ausgeschrieben) an; bestehende Artikel mit
 * dem alten Wert "L" wuerden sonst mit einer Auswahl angezeigt, die keiner
 * Dropdown-Option mehr entspricht.
 *
 * Idempotent: Artikel mit bereits "Liter" oder einem anderen Wert werden nicht
 * angefasst; wiederholtes Ausfuehren aendert nach dem ersten Lauf nichts mehr.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.foodItem.updateMany({
      where: { unit: 'L' },
      data: { unit: 'Liter' }
    });
    console.log(`[migrate-food-unit-liter] ${result.count} Artikel von "L" auf "Liter" umgestellt.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
