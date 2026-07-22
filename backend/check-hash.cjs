const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const peter = await p.volunteer.findFirst({ where: { id: 1 } });
  console.log('Stored hash:', peter.password);
  
  const test = await bcrypt.compare('test123', peter.password);
  console.log('Compare test123:', test);
  
  // Test new hash
  const newHash = await bcrypt.hash('test123', 10);
  console.log('New hash:', newHash);
  const testNew = await bcrypt.compare('test123', newHash);
  console.log('Compare new hash:', testNew);
  
  await p.$disconnect();
}
main();
