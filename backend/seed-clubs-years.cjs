const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Clubs and YearGroups...');

  // Clubs anlegen (falls nicht vorhanden)
  const existingClubs = await prisma.club.count();
  if (existingClubs === 0) {
    console.log('Creating clubs...');
    
    const club1 = await prisma.club.create({
      data: {
        name: 'TSV Holm',
        primaryColor: '#198754',
        secondaryColor: '#ffffff',
        logo: null,
      }
    });

    console.log(`✅ Club created: ${club1.name} (ID: ${club1.id})`);
  } else {
    console.log(`⏩ Clubs already exist (${existingClubs}). Skipping.`);
  }

  // YearGroups anlegen (falls nicht vorhanden)
  const existingYears = await prisma.yearGroup.count();
  if (existingYears === 0) {
    console.log('Creating year groups...');
    
    const years = [
      { name: 'Jahrgang 2016', birthYearStart: 2016, birthYearEnd: 2016, order: 1 },
      { name: 'Jahrgang 2017', birthYearStart: 2017, birthYearEnd: 2017, order: 2 },
      { name: 'Jahrgang 2018', birthYearStart: 2018, birthYearEnd: 2018, order: 3 },
      { name: 'Jahrgang 2019', birthYearStart: 2019, birthYearEnd: 2019, order: 4 },
      { name: 'Jahrgang 2020', birthYearStart: 2020, birthYearEnd: 2020, order: 5 },
      { name: 'Jahrgang 2021', birthYearStart: 2021, birthYearEnd: 2021, order: 6 },
      { name: 'Jahrgang 2022', birthYearStart: 2022, birthYearEnd: 2022, order: 7 },
      { name: 'Jahrgang 2023', birthYearStart: 2023, birthYearEnd: 2023, order: 8 },
    ];

    for (const yg of years) {
      await prisma.yearGroup.create({ data: yg });
    }
    
    console.log(`✅ ${years.length} YearGroups created.`);
  } else {
    console.log(`⏩ YearGroups already exist (${existingYears}). Skipping.`);
  }

  console.log('🎉 Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
