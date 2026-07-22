const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    await p.$executeRawUnsafe('ALTER TABLE volunteers ADD COLUMN email TEXT DEFAULT NULL');
    console.log('✅ email column added');
  } catch (e) {
    console.log('⚠️ email:', e.message);
  }
  try {
    await p.$executeRawUnsafe('ALTER TABLE volunteers ADD COLUMN phone TEXT DEFAULT NULL');
    console.log('✅ phone column added');
  } catch (e) {
    console.log('⚠️ phone:', e.message);
  }
  await p.$disconnect();
}
main();
