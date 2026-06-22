const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {

    await prisma.users.createMany({
        data: [
            {
                email: "CB014416@students.apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "student"
            },
            {
                email: "CB014417@students.apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "student"
            },
            {
                email: "CB014418@students.apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "student"
            },
            {
                email: "kavin@apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "supervisor"
            },
            {
                email: "nirmala@apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "supervisor"
            },
            {
                email: "fathima@apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "pm"
            },
            {
                email: "nirosha@apiit.lk",
                password: bcrypt.hashSync("123@abc", 10),
                role: "admin"
            }
        ]
    });

    console.log("Users inserted successfully");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });