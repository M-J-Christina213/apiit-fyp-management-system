const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const submitProposal = async (req, res) => {
    try {
        const { student_id, supervisor_id, proposed_topic } = req.body;
        const file = req.file;

        const proposal = await prisma.proposal_requests.create({
            data: {
                student_id: Number(student_id),
                supervisor_id: Number(supervisor_id),
                proposed_topic,
                proposal_pdf: file?.filename,
                status: "Pending",
            },
        });

        res.json(proposal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit proposal" });
    }
};

const getStudentProposals = async (req, res) => {
    try {
        const proposals = await prisma.proposal_requests.findMany({
            where: {
                student_id: Number(req.params.id),
            },
            include: {
                supervisors: true,
            },
            orderBy: { submitted_at: "desc" },
        });

        res.json(proposals);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch proposals" });
    }
};

const updateProposalStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;

        const updated = await prisma.proposal_requests.update({
            where: { id: Number(req.params.id) },
            data: {
                status,
                rejection_reason: rejection_reason || null,
            },
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update proposal" });
    }
};

const getAllProposals = async (req, res) => {
    const data = await prisma.proposal_requests.findMany({
        include: {
            students: true,
            supervisors: true,
        },
        orderBy: { submitted_at: "desc" },
    });

    res.json(data);
};

const getSupervisorRequests = async (req, res) => {

    try {

        const proposals =
            await prisma.proposal_requests.findMany({

                where: {
                    supervisor_id: Number(req.params.id)
                },

                include: {
                    students: true
                },

                orderBy: {
                    submitted_at: "desc"
                }

            });

        res.json(proposals);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Failed"
        });

    }

};

const approveProposal = async (req, res) => {

    try {

        const proposal =
            await prisma.proposal_requests.update({

                where: {
                    id: Number(req.params.id)
                },

                data: {
                    status: "Approved"
                }

            });

        await prisma.notifications.create({

            data: {

                user_id: proposal.student_id,

                title: "Proposal Approved",

                message: "Your proposal has been approved by the supervisor."

            }

        });

        res.json(proposal);

    } catch (err) {

        res.status(500).json({
            error: "Failed"
        });

    }

}

const rejectProposal = async (req, res) => {

    try {

        const {

            reason

        } = req.body;

        const proposal =
            await prisma.proposal_requests.update({

                where: {
                    id: Number(req.params.id)
                },

                data: {

                    status: "Rejected",

                    rejection_reason: reason

                }

            });

        await prisma.notifications.create({

            data: {

                user_id: proposal.student_id,

                title: "Proposal Rejected",

                message: reason

            }

        });

        res.json(proposal);

    } catch (err) {

        res.status(500).json({
            error: "Failed"
        });

    }

}

const confirmSupervisor = async (req, res) => {

    try {

        const proposal =
            await prisma.proposal_requests.findUnique({

                where: {
                    id: Number(req.params.id)
                }

            });

        await prisma.student_fyp_records.create({

            data: {

                student_id: proposal.student_id,

                supervisor_id: proposal.supervisor_id,

                tentative_topic: proposal.proposed_topic,

                supervisor_confirmation_status: "Confirmed"

            }

        });

        await prisma.proposal_requests.update({

            where: {
                id: proposal.id
            },

            data: {
                student_confirmed: true
            }

        });

        // Reject every other approved proposal

        await prisma.proposal_requests.updateMany({

            where: {

                student_id: proposal.student_id,

                id: {
                    not: proposal.id
                },

                status: "Approved"

            },

            data: {

                status: "Declined"

            }

        });

        await prisma.notifications.create({

            data: {

                user_id: proposal.student_id,

                title: "Supervisor Confirmed",

                message: "You have successfully confirmed your supervisor."

            }

        });

        res.json({
            message: "Confirmed"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Failed"
        });

    }

}

module.exports = {
    submitProposal,
    getStudentProposals,
    updateProposalStatus,
    getAllProposals,
    getSupervisorRequests,
    approveProposal,
    rejectProposal,
    confirmSupervisor
};