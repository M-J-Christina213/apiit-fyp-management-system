const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/* ============================================================
   Register External Supervisor
============================================================ */

const registerExternalSupervisor = async (req, res) => {

    try {

        const {
            title,
            fullName,
            email,
            password,
            university,
            expertise,
            researchInterests,
            preferredSlots
        } = req.body;

        if (
            !fullName ||
            !email ||
            !password ||
            !university
        ) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields."
            });
        }

        // Check existing login account
        const existingUser = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account already exists with this email."
            });
        }

        // Check pending request
        const existingRequest =
            await prisma.external_supervisor_requests.findUnique({
                where: {
                    email
                }
            });

        if (existingRequest) {

            return res.status(400).json({
                success: false,
                message:
                    "A registration request already exists for this email."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {

            // Login account (Inactive)
            await tx.users.create({

                data: {

                    name: fullName,
                    email,
                    password: hashedPassword,
                    role: "supervisor",
                    is_active: false

                }

            });

            // Registration request
            await tx.external_supervisor_requests.create({

                data: {

                    title,
                    name: fullName,
                    email,
                    password: hashedPassword,
                    university,
                    expertise,
                    research_interests: researchInterests,
                    preferred_supervision_slots:
                        Number(preferredSlots) || 3

                }

            });

        });

        return res.status(201).json({

            success: true,

            message:
                "Registration submitted successfully. Your account will be activated after Admin approval."

        });

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Failed to submit registration."

        });

    }

};


/* ============================================================
   Get Pending Requests
============================================================ */

const getPendingExternalSupervisors = async (req, res) => {

    try {

        const requests =
            await prisma.external_supervisor_requests.findMany({

                orderBy: {
                    created_at: "desc"
                }

            });

        return res.json({

            success: true,

            data: requests

        });

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Unable to load external supervisor requests."

        });

    }

};


/* ============================================================
   Approve External Supervisor
============================================================ */

const approveExternalSupervisor = async (req, res) => {

    try {

        const { id } = req.params;

        const request =
            await prisma.external_supervisor_requests.findUnique({

                where: {
                    id: Number(id)
                }

            });

        if (!request) {

            return res.status(404).json({

                success: false,

                message:
                    "Registration request not found."

            });

        }

        if (request.status === "Approved") {

            return res.status(400).json({

                success: false,

                message:
                    "This request has already been approved."

            });

        }

        await prisma.$transaction(async (tx) => {

            // Create Supervisor
            await tx.supervisors.create({

                data: {

                    title: request.title,
                    name: request.name,
                    email: request.email,
                    expertise: request.expertise,
                    research_interests:
                        request.research_interests,
                    preferred_supervision_slots:
                        request.preferred_supervision_slots

                }

            });

            // Activate login
            await tx.users.update({

                where: {
                    email: request.email
                },

                data: {
                    is_active: true
                }

            });

            // Update request
            await tx.external_supervisor_requests.update({

                where: {
                    id: Number(id)
                },

                data: {

                    status: "Approved",
                    rejection_reason: null

                }

            });

        });

        return res.json({

            success: true,

            message:
                "External Supervisor approved successfully."

        });

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Approval failed."

        });

    }

};


/* ============================================================
   Reject External Supervisor
============================================================ */

const rejectExternalSupervisor = async (req, res) => {

    try {

        const { id } = req.params;

        const { rejectionReason } = req.body;

        if (!rejectionReason) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a rejection reason."

            });

        }

        const request =
            await prisma.external_supervisor_requests.findUnique({

                where: {
                    id: Number(id)
                }

            });

        if (!request) {

            return res.status(404).json({

                success: false,

                message:
                    "Registration request not found."

            });

        }

        await prisma.$transaction(async (tx) => {

            await tx.external_supervisor_requests.update({

                where: {
                    id: Number(id)
                },

                data: {

                    status: "Rejected",

                    rejection_reason:
                        rejectionReason

                }

            });

            // Keep login disabled
            await tx.users.update({

                where: {
                    email: request.email
                },

                data: {

                    is_active: false

                }

            });

        });

        return res.json({

            success: true,

            message:
                "Registration request rejected."

        });

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Failed to reject registration."

        });

    }

};


/* ============================================================
   Login Status Check
   (Used by Login Page)
============================================================ */

const getExternalSupervisorStatus = async (email) => {

    return await prisma.external_supervisor_requests.findUnique({

        where: {

            email

        },

        select: {

            status: true,
            rejection_reason: true

        }

    });

};


module.exports = {

    registerExternalSupervisor,
    getPendingExternalSupervisors,
    approveExternalSupervisor,
    rejectExternalSupervisor,
    getExternalSupervisorStatus

};