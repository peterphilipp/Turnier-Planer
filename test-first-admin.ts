import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  console.log('adminCount:', adminCount);
}
main();
