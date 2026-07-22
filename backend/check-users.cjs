const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.volunteer.findMany({
    select: { id: true, name: true, email: true, password: true },
  });
  users.forEach(v => {
    console.log(`ID: ${v.id}, Name: ${v.name}, Email: ${v.email}, Password: ${v.password ? 'HAS PWD' : 'NO PWD'}`);
  });
  await p.$disconnect();
}
main();
