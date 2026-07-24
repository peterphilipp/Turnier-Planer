const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== Admin Role Check & Fix ===\n');
  
  const users = await p.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log('Users in DB:');
  users.forEach(u => console.log(`  ${u.name} (${u.email}) → role="${u.role}"`));
  
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  console.log(`\nAdmin count: ${adminCount}`);
  
  if (adminCount === 0 && users.length > 0) {
    // Find Peter Philipp specifically
    let targetUser = users.find(u => u.email?.includes('philipp') || u.name?.includes('Philipp'));
    if (!targetUser) targetUser = users[0];
    
    console.log(`\nPromoting ${targetUser.name} (${targetUser.email}) to ADMIN...`);
    const updated = await p.user.update({ 
      where: { id: targetUser.id }, 
      data: { role: 'ADMIN' } 
    });
    console.log('✅ Updated:', updated.name, updated.email, '→', updated.role);
  } else if (adminCount > 0) {
    const admins = users.filter(u => u.role === 'ADMIN');
    console.log('\nAdmins already exist:');
    admins.forEach(a => console.log(`  ${a.name} (${a.email})`));
  } else {
    console.log('\n⚠️ No users found. Run seed first.');
  }
  
  await p.$disconnect();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
