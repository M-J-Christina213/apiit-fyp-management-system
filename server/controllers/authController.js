const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const login = async (req, res) => {

    const { email, password } = req.body;

    const user = await prisma.users.findUnique({
        where: {
            email
        }
    });

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    return res.status(200).json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            cbNo: user.cbNo
        }
    });
};

module.exports = { login };