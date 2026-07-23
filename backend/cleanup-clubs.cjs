const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Vereine bereinigen...\n');
  
  // Alle Vereine holen
  const allClubs = await prisma.club.findMany();
  console.log(`📊 Insgesamt: ${allClubs.length} Vereine\n`);
  
  // Schütze TSV Holm und HSV
  const protectedNames = ['TSV Holm', 'Hamburger Sport-Verein e.V. (HSV)', 'HSV'];
  
  let deleted = 0;
  for (const club of allClubs) {
    if (!protectedNames.some(name => club.name.includes(name))) {
      await prisma.club.delete({ where: { id: club.id } });
      console.log(`🗑️ Gelöscht: ${club.name} (${club.city})`);
      deleted++;
    } else {
      console.log(`✅ Behalten: ${club.name}`);
    }
  }
  
  // 8 Testvereine anlegen
  const testClubs = [
    { name: 'FC Rot-Weiß Teststadt', city: 'Teststadt' },
    { name: 'SV Grün-Blau Musterhausen', city: 'Musterhausen' },
    { name: 'TSV Weiß-Rot Probeland', city: 'Probeland' },
    { name: 'SC Schwarz-Gelb Übungsberg', city: 'Übungsberg' },
    { name: 'BV Blau-Weil Beispielort', city: 'Beispielort' },
    { name: 'FV Rot-Silber Testdorf', city: 'Testdorf' },
    { name: 'SG Grün-Gold Musterfeld', city: 'Musterfeld' },
    { name: 'TuS Schwarz-Weiß Probeheim', city: 'Probeheim' },
  ];
  
  console.log('\n➕ Neue Testvereine:\n');
  for (const club of testClubs) {
    await prisma.club.create({ data: club });
    console.log(`✅ Erstellt: ${club.name} (${club.city})`);
  }
  
  const total = await prisma.club.count();
  console.log(`\n📊 Ergebnis: ${deleted} gelöscht, ${testClubs.length} neu, ${total} gesamt`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
