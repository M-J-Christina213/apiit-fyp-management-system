const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.get("/", async (req, res) => {
    try {
        const users = await prisma.users.findMany();

        res.json(users);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch users"
        });
    }
});

module.exports = router;