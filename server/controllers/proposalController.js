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


module.exports = {
    submitProposal,
    getStudentProposals,
    updateProposalStatus,
    getAllProposals
};