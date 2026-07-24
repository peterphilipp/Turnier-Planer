const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log(JSON.stringify(users, null, 2));
  
  // Promote first user to ADMIN if none exists
  const hasAdmin = users.some(u => u.role === 'ADMIN');
  if (!hasAdmin && users.length > 0) {
    const adminUser = await p.user.update({ where: { id: users[0].id }, data: { role: 'ADMIN' } });
    console.log('\n✅ First user promoted to ADMIN:', adminUser.email);
  } else if (hasAdmin) {
    console.log('\n✅ Admin already exists');
  }
  
  await p.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
