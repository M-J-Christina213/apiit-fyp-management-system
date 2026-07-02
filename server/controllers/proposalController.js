const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const resolveStudentDbId = async (studentIdOrCbNo) => {
    if (!studentIdOrCbNo) return null;
    const parsed = Number(studentIdOrCbNo);
    if (!isNaN(parsed)) {
        return parsed;
    }
    const student = await prisma.students.findUnique({
        where: { cb_no: String(studentIdOrCbNo) }
    });
    return student ? student.id : null;
};

const formatProposal = (p) => {
    if (!p) return null;
    return {
        ...p,
        studentId: p.student_id,
        supervisorId: p.supervisor_id,
        student_name: p.students?.student_name || "N/A",
        student_cb_no: p.students?.cb_no || "N/A",
        supervisor_name: p.supervisors 
            ? `${p.supervisors.title || ""} ${p.supervisors.name}`.trim() 
            : "N/A"
    };
};

const submitProposal = async (req, res) => {
    try {
        const { student_id, supervisor_id, proposed_topic } = req.body;
        const file = req.file;

        const studentDbId = await resolveStudentDbId(student_id);

        const proposal = await prisma.proposal_requests.create({
            data: {
                student_id: studentDbId,
                supervisor_id: Number(supervisor_id),
                proposed_topic,
                proposal_pdf: file?.filename,
                status: "Pending",
            },
            include: {
                students: true,
                supervisors: true
            }
        });

        res.json(formatProposal(proposal));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit proposal" });
    }
};

const getStudentProposals = async (req, res) => {
    try {
        const studentDbId = await resolveStudentDbId(req.params.id);

        const proposals = await prisma.proposal_requests.findMany({
            where: {
                student_id: studentDbId,
            },
            include: {
                students: true,
                supervisors: true,
            },
            orderBy: { submitted_at: "desc" },
        });

        res.json(proposals.map(formatProposal));
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
            include: {
                students: true,
                supervisors: true
            }
        });

        res.json(formatProposal(updated));
    } catch (err) {
        res.status(500).json({ error: "Failed to update proposal" });
    }
};

const getAllProposals = async (req, res) => {
    try {
        const data = await prisma.proposal_requests.findMany({
            include: {
                students: true,
                supervisors: true,
            },
            orderBy: { submitted_at: "desc" },
        });

        res.json(data.map(formatProposal));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch proposals" });
    }
};

const getSupervisorRequests = async (req, res) => {
    try {
        const proposals = await prisma.proposal_requests.findMany({
            where: {
                supervisor_id: Number(req.params.id)
            },
            include: {
                students: true,
                supervisors: true
            },
            orderBy: {
                submitted_at: "desc"
            }
        });

        res.json(proposals.map(formatProposal));
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Failed"
        });
    }
};

const approveProposal = async (req, res) => {
    try {
        const proposal = await prisma.proposal_requests.update({
            where: {
                id: Number(req.params.id)
            },
            data: {
                status: "Approved"
            },
            include: {
                students: true,
                supervisors: true
            }
        });

        await prisma.notifications.create({
            data: {
                user_id: proposal.student_id,
                title: "Proposal Approved",
                message: "Your proposal has been approved by the supervisor."
            }
        });

        res.json(formatProposal(proposal));
    } catch (err) {
        res.status(500).json({
            error: "Failed"
        });
    }
};

const rejectProposal = async (req, res) => {
    try {
        const { reason } = req.body;

        const proposal = await prisma.proposal_requests.update({
            where: {
                id: Number(req.params.id)
            },
            data: {
                status: "Rejected",
                rejection_reason: reason
            },
            include: {
                students: true,
                supervisors: true
            }
        });

        await prisma.notifications.create({
            data: {
                user_id: proposal.student_id,
                title: "Proposal Rejected",
                message: reason
            }
        });

        res.json(formatProposal(proposal));
    } catch (err) {
        res.status(500).json({
            error: "Failed"
        });
    }
};

const confirmSupervisor = async (req, res) => {
    try {
        const proposal = await prisma.proposal_requests.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });

        if (!proposal) {
            return res.status(404).json({ error: "Proposal not found" });
        }

        const existingRecord = await prisma.student_fyp_records.findFirst({
            where: { student_id: proposal.student_id }
        });

        if (existingRecord) {
            await prisma.student_fyp_records.update({
                where: { id: existingRecord.id },
                data: {
                    supervisor_id: proposal.supervisor_id,
                    tentative_topic: proposal.proposed_topic,
                    supervisor_confirmation_status: "Confirmed"
                }
            });
        } else {
            await prisma.student_fyp_records.create({
                data: {
                    student_id: proposal.student_id,
                    supervisor_id: proposal.supervisor_id,
                    tentative_topic: proposal.proposed_topic,
                    supervisor_confirmation_status: "Confirmed"
                }
            });
        }

        await prisma.proposal_requests.update({
            where: {
                id: proposal.id
            },
            data: {
                student_confirmed: true
            }
        });

        // Reject every other proposal for this student
        await prisma.proposal_requests.updateMany({
            where: {
                student_id: proposal.student_id,
                id: {
                    not: proposal.id
                }
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
};

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