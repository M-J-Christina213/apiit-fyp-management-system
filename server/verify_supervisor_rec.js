const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sup = await prisma.supervisors.findFirst({
    where: { email: { equals: 'TestK1@apiit.lk', mode: 'insensitive' } }
  });
  console.log('=== TestK1 Supervisor Record ===\n', JSON.stringify(sup, null, 2));
}

main().finally(() => prisma.$disconnect());
