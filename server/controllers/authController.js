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
                role: user.role.toLowerCase(),
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
        const authCodeUrlParameters = {
            scopes: ["User.Read"],
            redirectUri: "http://localhost:5173",
        };

        const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
        res.redirect(response);
    } catch (error) {
        console.error("Azure login error:", error);
        res.status(500).json({ success: false, message: "Azure authentication failed" });
    }
};

const azureCallback = async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ success: false, message: "Authorization code is missing" });
        }

        const tokenRequest = {
            code: code,
            scopes: ["User.Read"],
            redirectUri: "http://localhost:5173",
        };

        const response = await msalClient.acquireTokenByCode(tokenRequest);
        const { account } = response;
        
        const email = account.username;

        // Find user in DB
        const user = await prisma.users.findUnique({
            where: { email: email }
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
                role: user.role.toLowerCase(),
                cbNo: user.cbNo
            }
        });

    } catch (error) {
        console.error("Azure callback error:", error);
        return res.status(500).json({ success: false, message: `Azure authentication failed: ${error.message}` });
    }
};

module.exports = {
    login,
    azureLogin,
    azureCallback
};