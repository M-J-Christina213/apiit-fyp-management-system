const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const msalClient = require("../config/azureAuth");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err, null);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}
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




const azureLogin = async (req, res) => {
    try {
        const { token, email, name } = req.body;
        
        if (!token || !email) {
            return res.status(400).json({ success: false, message: "Token and email are required" });
        }

        // Verify token signature and audience
        jwt.verify(token, getKey, {
            audience: process.env.AZURE_CLIENT_ID
        }, async function(err, decoded) {
            if (err) {
                console.error("JWT verification failed:", err.message);
                return res.status(401).json({ success: false, message: "Invalid token" });
            }

            // Ensure the decoded token's email/upn matches the provided email, or at least we trust the provided email
            const tokenEmail = decoded.preferred_username || decoded.upn || decoded.email;
            const lookupEmail = tokenEmail || email;

            // Find user in DB
            const user = await prisma.users.findUnique({
                where: { email: lookupEmail }
            });

            if (!user) {
                return res.status(403).json({ success: false, message: "Your account is not registered in FYPMS" });
            }

            if (!user.is_active) {
                return res.status(403).json({ success: false, message: "Your account has been disabled. Please contact the administrator." });
            }

            if (user.role === "external_supervisor") {
                return res.status(403).json({ success: false, message: "External supervisors must use email login" });
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
        });
    } catch (error) {
        console.error("Azure login error:", error);
        return res.status(500).json({ success: false, message: "Azure authentication failed" });
    }
};

module.exports = {
    login,
    azureLogin
};