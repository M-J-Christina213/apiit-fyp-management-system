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
        const cleanEmail = String(email || "").trim().toLowerCase();
        const rawPassword = String(password || "");

        const tempLoginEnabled = process.env.TEMP_LOGIN_ENABLED === "true";
        const tempPassword = process.env.TEMP_LOGIN_PASSWORD || "123@abc";

        // Helper to check temporary password match
        const isTempPasswordValid = tempLoginEnabled && (rawPassword === tempPassword);

        // ------------------------------------------
        // 1. Find User directly in `users` table
        // ------------------------------------------

        let user = await prisma.users.findFirst({
            where: {
                email: { equals: cleanEmail, mode: "insensitive" }
            }
        });

        // ------------------------------------------
        // 2. If user exists in `users` table
        // ------------------------------------------
        if (user) {
            let isPasswordValid = false;

            if (user.password) {
                // User has a real hashed password -> strictly verify against real password
                // Do NOT allow temporary password to bypass an existing real password
                isPasswordValid = await bcrypt.compare(rawPassword, user.password);
            } else {
                // User has no password / password is null -> allow temporary password if enabled
                if (isTempPasswordValid) {
                    isPasswordValid = true;
                }
            }

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            // Check account status
            if (!user.is_active) {
                const request = await prisma.external_supervisor_requests.findUnique({
                    where: { email: user.email }
                });

                if (request) {
                    if (request.status === "Pending") {
                        return res.status(403).json({
                            success: false,
                            message: "Your registration is currently pending Admin approval."
                        });
                    }
                    if (request.status === "Rejected") {
                        return res.status(403).json({
                            success: false,
                            message: `Your registration was rejected.\nReason: ${request.rejection_reason}`
                        });
                    }
                }

                return res.status(403).json({
                    success: false,
                    message: "Your account has been disabled. Please contact the administrator."
                });
            }

            // Student cbNo derivation
            let derivedCbNo = user.cbNo;
            if (!derivedCbNo && user.role && user.role.toLowerCase() === "student") {
                const studentMatch = user.email.match(/^([a-z0-9]+)@students\.apiit\.lk$/i);
                if (studentMatch) {
                    derivedCbNo = studentMatch[1].toUpperCase();
                }
            }

            return res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role.toLowerCase(),
                    cbNo: derivedCbNo
                }
            });
        }

        // ------------------------------------------
        // 3. If not found in `users`, check temporary login for students / staff
        // ------------------------------------------
        if (!tempLoginEnabled || !isTempPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Check student format: CB_NUMBER@students.apiit.lk
        const studentMatch = cleanEmail.match(/^(CB\d+)@students\.apiit\.lk$/i);
        if (studentMatch) {
            const cbNumber = studentMatch[1];
            const student = await prisma.students.findFirst({
                where: {
                    cb_no: { equals: cbNumber, mode: "insensitive" }
                }
            });

            if (student) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: student.id,
                        name: student.student_name,
                        email: cleanEmail,
                        role: "student",
                        cbNo: student.cb_no
                    }
                });
            }
        }

        // Check staff format: name@apiit.lk
        const staffMatch = cleanEmail.match(/^([^@]+)@apiit\.lk$/i);
        if (staffMatch) {
            // Check in supervisors
            const supervisor = await prisma.supervisors.findFirst({
                where: {
                    email: { equals: cleanEmail, mode: "insensitive" }
                }
            });

            if (supervisor) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: supervisor.id,
                        name: supervisor.name,
                        email: supervisor.email,
                        role: "supervisor",
                        cbNo: null
                    }
                });
            }

            // Check in assessors
            const assessor = await prisma.assessors.findFirst({
                where: {
                    email: { equals: cleanEmail, mode: "insensitive" }
                }
            });

            if (assessor) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: assessor.id,
                        name: assessor.name,
                        email: assessor.email,
                        role: "assessor",
                        cbNo: null
                    }
                });
            }
        }

        // Generic error if no matching record found
        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });

    } catch (error) {
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
        
        const email = String(account.username || "").trim().toLowerCase();

        // Find user in DB (Case-insensitive)
        const user = await prisma.users.findFirst({
            where: { email: { equals: email, mode: "insensitive" } }
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