const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const t1 = await prisma.users.findFirst({
    where: { email: { equals: 'TestK1@apiit.lk', mode: 'insensitive' } }
  });
  console.log('=== TestK1 (Supervisor) ===\n', JSON.stringify(t1, null, 2));

  const t2 = await prisma.users.findFirst({
    where: { email: { equals: 'TestK2@apiit.lk', mode: 'insensitive' } }
  });
  console.log('=== TestK2 (PM) ===\n', JSON.stringify(t2, null, 2));

  const t3 = await prisma.users.findFirst({
    where: { email: { equals: 'TestK3@apiit.lk', mode: 'insensitive' } }
  });
  console.log('=== TestK3 (Admin) ===\n', JSON.stringify(t3, null, 2));
}

main().finally(() => prisma.$disconnect());
