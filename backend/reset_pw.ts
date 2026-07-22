import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function reset() {
  const email = 'peter.philipp@web.de';
  const hashed = await bcrypt.hash('123456', 10);
  await prisma.volunteer.updateMany({
    where: { email },
    data: { password: hashed }
  });
  console.log("Password for Peter reset to: 123456");
}

reset().finally(() => prisma.$disconnect());
