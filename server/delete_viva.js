const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Deleting viva periods...");
    await prisma.viva_periods.deleteMany();
    console.log("Deleted all viva periods.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
