const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        // ------------------------------------------
        // Find User
        // ------------------------------------------

        const user = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        // ------------------------------------------
        // Check Password
        // ------------------------------------------

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        // ------------------------------------------
        // Account Disabled
        // ------------------------------------------

        if (!user.is_active) {

            // Check whether this is an external supervisor
            const request =
                await prisma.external_supervisor_requests.findUnique({

                    where: {
                        email: user.email
                    }

                });

            if (request) {

                // Pending
                if (request.status === "Pending") {

                    return res.status(403).json({

                        success: false,

                        message:
                            "Your registration is currently pending Admin approval."

                    });

                }

                // Rejected
                if (request.status === "Rejected") {

                    return res.status(403).json({

                        success: false,

                        message:
                            `Your registration was rejected.\nReason: ${request.rejection_reason}`

                    });

                }

            }

            // Any other inactive account
            return res.status(403).json({

                success: false,

                message:
                    "Your account has been disabled. Please contact the administrator."

            });

        }

        // ------------------------------------------
        // Login Success
        // ------------------------------------------

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

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Login failed."

        });

    }

};

module.exports = {
    login
};