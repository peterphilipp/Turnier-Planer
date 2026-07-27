import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.$connect();
const users = await p.user.findMany({select:{id:true,name:true,email:true,role:true}});
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();
