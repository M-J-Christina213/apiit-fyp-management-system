const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ======================================================
// GET ALL MILESTONES BY BATCH (PM Dashboard)
// ======================================================
exports.getMilestonesByBatch = async (req, res) => {
    const batchId = parseInt(req.params.batchId);
    if (isNaN(batchId)) return res.status(400).json({ error: "Invalid Batch ID" });

    try {
        const milestones = await prisma.milestones.findMany({
            where: { batch_id: batchId },
            orderBy: { order_index: "asc" }
        });
        res.status(200).json(milestones);
    } catch (error) {
        console.error("Get Milestones Error:", error);
        res.status(500).json({ error: "Failed to fetch milestones", details: error.message });
    }
};

// ======================================================
// CREATE MILESTONE
// ======================================================
exports.createMilestone = async (req, res) => {
    const { batch_id, name, description, type, deadline, order_index } = req.body;

    if (!batch_id || !name || !type || !deadline) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const milestone = await prisma.milestones.create({
            data: {
                batch_id: parseInt(batch_id),
                name,
                description,
                type,
                deadline: new Date(deadline),
                order_index: order_index ? parseInt(order_index) : 0
            }
        });
        
        // Seed status
        const students = await prisma.students.findMany({ where: { batch_id: parseInt(batch_id) } });
        if (students.length > 0) {
            await prisma.student_milestone_status.createMany({
                data: students.map(s => ({
                    student_id: s.id,
                    milestone_id: milestone.id,
                    status: "Upcoming"
                })),
                skipDuplicates: true
            });
        }

        res.status(201).json({ message: "Milestone created successfully", milestone });
    } catch (error) {
        console.error("Create Milestone Error:", error);
        res.status(500).json({ error: "Failed to create milestone", details: error.message });
    }
};

// ======================================================
// UPDATE MILESTONE
// ======================================================
exports.updateMilestone = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid Milestone ID" });

    const { name, description, type, deadline, order_index } = req.body;

    try {
        const milestone = await prisma.milestones.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(type && { type }),
                ...(deadline && { deadline: new Date(deadline) }),
                ...(order_index !== undefined && { order_index: parseInt(order_index) })
            }
        });
        res.status(200).json({ message: "Milestone updated successfully", milestone });
    } catch (error) {
        res.status(500).json({ error: "Failed to update milestone", details: error.message });
    }
};

// ======================================================
// DELETE MILESTONE
// ======================================================
exports.deleteMilestone = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid Milestone ID" });

    try {
        await prisma.milestones.delete({ where: { id } });
        res.status(200).json({ message: "Milestone deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete milestone", details: error.message });
    }
};

// ======================================================
// UPDATE STUDENT MILESTONE STATUS
// ======================================================
exports.updateStudentStatus = async (req, res) => {
    const { student_id, milestone_id, status } = req.body;

    if (!student_id || !milestone_id || !status) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const record = await prisma.student_milestone_status.upsert({
            where: {
                student_id_milestone_id: {
                    student_id: parseInt(student_id),
                    milestone_id: parseInt(milestone_id)
                }
            },
            update: {
                status,
                submitted_at: status === "Submitted" || status === "Graded" ? new Date() : null
            },
            create: {
                student_id: parseInt(student_id),
                milestone_id: parseInt(milestone_id),
                status,
                submitted_at: status === "Submitted" || status === "Graded" ? new Date() : null
            }
        });
        res.status(200).json({ message: "Student status updated", record });
    } catch (error) {
        res.status(500).json({ error: "Failed to update status", details: error.message });
    }
};

// ======================================================
// GET STUDENT PROGRESS
// ======================================================
exports.getStudentProgress = async (req, res) => {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) return res.status(400).json({ error: "Invalid Student ID" });

    try {
        const student = await prisma.students.findUnique({
            where: { id: studentId }
        });

        if (!student || !student.batch_id) {
            return res.status(404).json({ error: "Student or batch not found" });
        }

        const milestones = await prisma.milestones.findMany({
            where: { batch_id: student.batch_id },
            orderBy: [{ order_index: "asc" }, { deadline: "asc" }]
        });

        const statuses = await prisma.student_milestone_status.findMany({
            where: { student_id: studentId }
        });
        const statusMap = {};
        statuses.forEach(s => statusMap[s.milestone_id] = s);

        let currentMilestone = null;
        let foundCurrent = false;

        const timeline = milestones.map(m => {
            const s = statusMap[m.id];
            
            let derivedStatus = s ? s.status : "Upcoming";
            if (!s || (s.status !== "Submitted" && s.status !== "Graded")) {
                if (new Date() > new Date(m.deadline)) {
                    derivedStatus = "Overdue";
                }
            }

            const item = {
                ...m,
                status_record: s || null,
                derived_status: derivedStatus,
                is_current: false
            };

            if (!foundCurrent && derivedStatus !== "Submitted" && derivedStatus !== "Graded") {
                item.is_current = true;
                currentMilestone = item;
                foundCurrent = true;
            }

            return item;
        });

        res.status(200).json({
            student,
            currentMilestone,
            timeline
        });

    } catch (error) {
        console.error("Get Student Progress Error:", error);
        res.status(500).json({ error: "Failed to fetch student progress", details: error.message });
    }
};
