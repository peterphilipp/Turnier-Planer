const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('test123', 10);
  
  const peter = await p.volunteer.findFirst({ where: { name: 'Peter' } });
  if (peter) {
    await p.volunteer.update({ where: { id: peter.id }, data: { password: hashed, email: 'peter@tsv-holm.de', phone: '0170-1234567' } });
    console.log('✅ Peter aktualisiert: peter@tsv-holm.de / test123');
  } else {
    const v = await p.volunteer.create({ data: { name: 'Peter', email: 'peter@tsv-holm.de', phone: '0170-1234567', password: hashed, roles: '["Helfer"]' } });
    console.log('✅ Peter erstellt: peter@tsv-holm.de / test123');
  }
  
  const maria = await p.volunteer.findFirst({ where: { name: 'Maria' } });
  if (maria) {
    await p.volunteer.update({ where: { id: maria.id }, data: { password: hashed, email: 'maria@tsv-holm.de', phone: '0170-7654321' } });
    console.log('✅ Maria aktualisiert: maria@tsv-holm.de / test123');
  } else {
    const v = await p.volunteer.create({ data: { name: 'Maria', email: 'maria@tsv-holm.de', phone: '0170-7654321', password: hashed, roles: '["Helfer"]' } });
    console.log('✅ Maria erstellt: maria@tsv-holm.de / test123');
  }
  
  await p.$disconnect();
}
main();
