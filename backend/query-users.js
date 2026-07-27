const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect().then(async () => {
  const users = await p.user.findMany({select:{id:true,name:true,email:true,role:true}});
  console.log(JSON.stringify(users, null, 2));
}).finally(() => p.$disconnect());
