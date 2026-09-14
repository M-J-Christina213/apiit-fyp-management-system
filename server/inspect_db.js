const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany({ select: { id: true, email: true, role: true } });
  console.log('=== USERS ===');
  console.table(users);

  const periods = await prisma.viva_periods.findMany({ select: { id: true, name: true, status: true } });
  console.log('=== VIVA PERIODS ===');
  console.table(periods);

  const schedules = await prisma.viva_schedules.findMany({ select: { id: true, student_id: true, status: true } });
  console.log('=== VIVA SCHEDULES ===');
  console.table(schedules);
}

main().finally(() => prisma.$disconnect());
