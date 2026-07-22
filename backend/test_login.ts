import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function test() {
  const email = 'peter.philipp@web.de';
  const volunteer = await prisma.volunteer.findFirst({ where: { email } });
  console.log("Found volunteer:", volunteer);
  if (volunteer) {
     console.log("Password hash:", volunteer.password);
     // Try to compare with some common passwords if possible, or just generate a new hash to see if the structure is correct
     const testHash = await bcrypt.hash('123456', 10);
     console.log("Example hash for 123456:", testHash);
  }
}

test().finally(() => prisma.$disconnect());
