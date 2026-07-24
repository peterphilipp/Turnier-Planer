import { PrismaClient } from './backend/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  console.log('adminCount:', adminCount);
}
main();
