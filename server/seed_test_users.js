const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { ROLES, normalizeEmail } = require('./utils/roles');

const prisma = new PrismaClient();

async function seedTestUsers() {
    console.log("=== SEEDING / VERIFYING REQUIRED TEST USERS ===");

    const defaultPassword = process.env.TEST_USER_PASSWORD || "123@abc";
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    const testAccounts = [
        {
            email: "TestK1@apiit.lk",
            role: ROLES.SUPERVISOR,
            name: "Dr. TestK1 Supervisor",
            isSupervisorProfile: true
        },
        {
            email: "TestK2@apiit.lk",
            role: ROLES.PM,
            name: "TestK2 Project Manager",
            isSupervisorProfile: false
        },
        {
            email: "TestK3@apiit.lk",
            role: ROLES.ADMIN,
            name: "TestK3 System Administrator",
            isSupervisorProfile: false
        }
    ];

    for (const acc of testAccounts) {
        const normEmail = normalizeEmail(acc.email);

        // Case-insensitive lookup
        const existingUser = await prisma.users.findFirst({
            where: { email: { equals: normEmail, mode: 'insensitive' } }
        });

        let userRecord;
        if (existingUser) {
            userRecord = await prisma.users.update({
                where: { id: existingUser.id },
                data: {
                    role: acc.role,
                    name: existingUser.name || acc.name,
                    is_active: true
                }
            });
            console.log(`Updated user ${acc.email} -> Role: ${acc.role}`);
        } else {
            userRecord = await prisma.users.create({
                data: {
                    email: normEmail,
                    password: hashedPassword,
                    role: acc.role,
                    name: acc.name,
                    is_active: true
                }
            });
            console.log(`Created user ${acc.email} -> Role: ${acc.role}`);
        }

        // If Supervisor, verify supervisor profile exists
        if (acc.isSupervisorProfile) {
            const existingSup = await prisma.supervisors.findFirst({
                where: { email: { equals: normEmail, mode: 'insensitive' } }
            });

            if (!existingSup) {
                await prisma.supervisors.create({
                    data: {
                        title: "Dr.",
                        name: acc.name,
                        email: normEmail,
                        expertise: "Computer Science, Software Engineering",
                        preferred_supervision_slots: 4
                    }
                });
                console.log(`Created supervisor profile for ${acc.email}`);
            } else {
                console.log(`Supervisor profile exists for ${acc.email}`);
            }
        }
    }
}

seedTestUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
