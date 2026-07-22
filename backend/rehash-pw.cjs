const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.volunteer.findMany({ select: { id: true, name: true, email: true, password: true } });
  users.forEach(u => {
    if (u.password && !u.password.startsWith('$2b$')) {
      console.log(u.name, 'hat Klartext-Passwort:', u.password);
    } else {
      console.log(u.name, 'hat Hash:', u.password ? u.password.substring(0, 20) + '...' : 'KEIN PASSWORT');
    }
  });
  
  // Re-hash all passwords
  const hashed = await bcrypt.hash('test123', 10);
  await p.volunteer.updateMany({
    where: {},
    data: { password: hashed },
  });
  console.log('✅ Alle Passwörter neu gehasht');
  
  // Verify
  const peter = await p.volunteer.findFirst({ where: { id: 1 } });
  const match = await bcrypt.compare('test123', peter.password);
  console.log('Verify Peter:', match);
  
  await p.$disconnect();
}
main();
