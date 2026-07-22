const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('test123', 10);
  
  await p.volunteer.updateMany({
    where: { password: 'test123' },
    data: { password: hashed },
  });
  console.log('✅ Alle Passwörter auf Hash aktualisiert');
  
  // Verify
  const peter = await p.volunteer.findFirst({ where: { id: 1 } });
  const match = await bcrypt.compare('test123', peter.password);
  console.log('Verify Peter:', match);
  
  await p.$disconnect();
}
main();
