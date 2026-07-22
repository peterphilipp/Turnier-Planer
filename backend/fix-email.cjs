const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  await p.volunteer.update({ where: { id: 1 }, data: { email: 'peter@tsv-holm.de' } });
  console.log('✅ Peter Email aktualisiert: peter@tsv-holm.de');
  await p.$disconnect();
}
main();
