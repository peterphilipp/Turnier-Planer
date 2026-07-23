const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const clubs = [
  { name: 'Altona 93', city: 'Hamburg-Altona' },
  { name: 'Bahrenfelder SV von 1919 e.V.', city: 'Hamburg-Bahrenfeld' },
  { name: 'Blau-Weiß 96 Schenefeld e.V.', city: 'Schenefeld' },
  { name: 'Bramfelder SV von 1945 e.V.', city: 'Hamburg-Bramfeld' },
  { name: 'Duvenstedter SV von 1969 e.V.', city: 'Hamburg-Duvenstedt' },
  { name: 'SV Eidelstedt', city: 'Hamburg-Eidelstedt' },
  { name: 'SC Eilbek', city: 'Hamburg-Eilbek' },
  { name: 'Grün-Weiß Eimsbüttel', city: 'Hamburg-Eimsbüttel' },
  { name: 'Eimsbütteler Turnverband e.V.', city: 'Hamburg-Eimsbüttel' },
  { name: 'SV West-Eimsbüttel', city: 'Hamburg-Eimsbüttel' },
  { name: 'Elmshorn Gencler Birligi', city: 'Elmshorn' },
  { name: 'Farmsener Turnverein von 1926 e.V.', city: 'Hamburg-Farmsen' },
  { name: 'FC St. Pauli', city: 'Hamburg-St. Pauli' },
  { name: 'FC Union Tornesch', city: 'Tornesch' },
  { name: 'SV Halstenbek-Rellingen', city: 'Halstenbek/Rellingen' },
  { name: 'Hamburger Sport-Verein e.V. (HSV)', city: 'Hamburg-Bahrenfeld/Stellingen' },
  { name: 'HEBC von 1911 e.V.', city: 'Hamburg-Eimsbüttel' },
  { name: 'SV Hörnerkirchen e. V.', city: 'Brande-Hörnerkirchen' },
  { name: 'Kickers Halstenbek e.V.', city: 'Halstenbek' },
  { name: 'Kummerfelder Sportverein e.V. von 1960', city: 'Kummerfeld' },
  { name: 'Langenhorner TSV', city: 'Hamburg-Langenhorn' },
  { name: 'Lokstedter FC Eintracht von 1908 e.V.', city: 'Hamburg-Lokstedt' },
  { name: 'SV Lurup', city: 'Hamburg-Lurup' },
  { name: 'Moorreger SV von 1947 e.V.', city: 'Moorrege' },
  { name: 'Eintracht Norderstedt', city: 'Norderstedt' },
  { name: 'TuS Osdorf', city: 'Hamburg-Osdorf' },
  { name: 'FC Teutonia 05 Ottensen', city: 'Hamburg-Ottensen' },
  { name: 'VfL Pinneberg', city: 'Pinneberg' },
  { name: 'SC Poppenbüttel', city: 'Hamburg-Poppenbüttel' },
  { name: 'Rahlstedter SC von 1905 e.V.', city: 'Hamburg-Rahlstedt' },
  { name: 'Rasensport Uetersen 1926 e.V.', city: 'Uetersen' },
  { name: 'Rellinger FC 2010 e. V.', city: 'Rellingen' },
  { name: 'Rissener Sportverein von 1949 e.V.', city: 'Hamburg-Rissen' },
  { name: 'USC Paloma von 1909 e.V.', city: 'Hamburg-Barmbek' },
  { name: 'VfL 93 Hamburg', city: 'Hamburg-Winterhude' },
  { name: 'SC Victoria Hamburg', city: 'Hamburg-Eppendorf' },
  { name: 'Wandsbeker Turn- und Sportverein Concordia', city: 'Hamburg-Wandsbek/Marienthal' },
  { name: 'Wedeler Turn-und Sportverein e.V.', city: 'Wedel' },
];

async function main() {
  console.log('🏅 Importiere Vereine...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const club of clubs) {
    const existing = await prisma.club.findFirst({ where: { name: club.name } });
    
    if (existing) {
      console.log(`⏭️  Übersprungen: ${club.name}`);
      skipped++;
    } else {
      await prisma.club.create({ data: club });
      console.log(`✅ Erstellt: ${club.name} (${club.city})`);
      created++;
    }
  }
  
  const total = await prisma.club.count();
  console.log(`\n📊 Ergebnis: ${created} neu, ${skipped} übersprungen, ${total} gesamt`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
