const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ======================================================
// STATUS DERIVATION LOGIC (centralised)
// ======================================================

/**
 * Derive a display status for a milestone item.
 * Priority: stored Submitted/Graded > Due Today > Due Soon > Overdue > Upcoming
 */
function deriveStatus(storedStatus, deadline) {
    if (storedStatus === "Submitted" || storedStatus === "Graded") {
        return storedStatus;
    }
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Due Today";
    if (diffDays > 0 && diffDays <= 7) return "Due Soon";
    if (diffDays < 0) return "Overdue";
    return "Upcoming";
}

// ======================================================
// GET ALL MILESTONES BY BATCH (PM Dashboard)
// ======================================================
exports.getMilestonesByBatch = async (req, res) => {
    const batchId = parseInt(req.params.batchId);
    if (isNaN(batchId)) return res.status(400).json({ error: "Invalid Batch ID" });

    try {
        const milestones = await prisma.milestones.findMany({
            where: { batch_id: batchId },
            orderBy: [{ order_index: "asc" }, { deadline: "asc" }]
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
        return res.status(400).json({ error: "Missing required fields: batch_id, name, type, deadline" });
    }
    if (!["FORMATIVE", "SUMMATIVE"].includes(type)) {
        return res.status(400).json({ error: "type must be FORMATIVE or SUMMATIVE" });
    }

    try {
        const milestone = await prisma.milestones.create({
            data: {
                batch_id: parseInt(batch_id),
                name: name.trim(),
                description: description ? description.trim() : null,
                type,
                deadline: new Date(deadline),
                order_index: order_index !== undefined ? parseInt(order_index) : 0
            }
        });

        // Seed "Upcoming" status for all students currently in the batch
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

    if (type && !["FORMATIVE", "SUMMATIVE"].includes(type)) {
        return res.status(400).json({ error: "type must be FORMATIVE or SUMMATIVE" });
    }

    try {
        const milestone = await prisma.milestones.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description ? description.trim() : null }),
                ...(type && { type }),
                ...(deadline && { deadline: new Date(deadline) }),
                ...(order_index !== undefined && { order_index: parseInt(order_index) })
            }
        });
        res.status(200).json({ message: "Milestone updated successfully", milestone });
    } catch (error) {
        console.error("Update Milestone Error:", error);
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
        // Guard: prevent casual deletion of summative milestones that have been graded
        const graded = await prisma.student_milestone_status.findFirst({
            where: { milestone_id: id, status: "Graded" }
        });
        if (graded) {
            return res.status(409).json({
                error: "Cannot delete a summative milestone that has already been graded. Please contact an administrator."
            });
        }
        await prisma.milestones.delete({ where: { id } });
        res.status(200).json({ message: "Milestone deleted successfully" });
    } catch (error) {
        console.error("Delete Milestone Error:", error);
        res.status(500).json({ error: "Failed to delete milestone", details: error.message });
    }
};

// ======================================================
// UPDATE STUDENT MILESTONE STATUS (PM / Supervisor)
// ======================================================
exports.updateStudentStatus = async (req, res) => {
    const { student_id, milestone_id, status } = req.body;
    const validStatuses = ["Upcoming", "Submitted", "Graded", "Overdue"];

    if (!student_id || !milestone_id || !status) {
        return res.status(400).json({ error: "Missing required fields: student_id, milestone_id, status" });
    }
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
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
                submitted_at: (status === "Submitted" || status === "Graded") ? new Date() : null
            },
            create: {
                student_id: parseInt(student_id),
                milestone_id: parseInt(milestone_id),
                status,
                submitted_at: (status === "Submitted" || status === "Graded") ? new Date() : null
            }
        });
        res.status(200).json({ message: "Student milestone status updated", record });
    } catch (error) {
        console.error("Update Student Status Error:", error);
        res.status(500).json({ error: "Failed to update status", details: error.message });
    }
};

// ======================================================
// GET STUDENT PROGRESS by numeric student ID
// ======================================================
exports.getStudentProgress = async (req, res) => {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) return res.status(400).json({ error: "Invalid Student ID" });

    try {
        const result = await buildStudentTimeline(studentId);
        if (!result) return res.status(404).json({ error: "Student or batch not found" });
        res.status(200).json(result);
    } catch (error) {
        console.error("Get Student Progress Error:", error);
        res.status(500).json({ error: "Failed to fetch student progress", details: error.message });
    }
};

// ======================================================
// GET STUDENT PROGRESS by CB Number (used by Student dashboard)
// ======================================================
exports.getStudentProgressByCbNo = async (req, res) => {
    const { cbNo } = req.params;
    if (!cbNo) return res.status(400).json({ error: "CB Number required" });

    try {
        const student = await prisma.students.findUnique({ where: { cb_no: cbNo.toUpperCase() } });
        if (!student) return res.status(404).json({ error: "Student not found" });

        const result = await buildStudentTimeline(student.id);
        if (!result) return res.status(404).json({ error: "Student or batch not found" });
        res.status(200).json(result);
    } catch (error) {
        console.error("Get Progress By CbNo Error:", error);
        res.status(500).json({ error: "Failed to fetch student progress", details: error.message });
    }
};

// ======================================================
// GET SUPERVISOR STUDENTS MILESTONE OVERVIEW
// ======================================================
exports.getSupervisorMilestoneOverview = async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const supervisor = await prisma.supervisors.findUnique({ where: { email } });
        if (!supervisor) return res.status(404).json({ error: "Supervisor not found" });

        // Get all students supervised
        const records = await prisma.student_fyp_records.findMany({
            where: { supervisor_id: supervisor.id },
            include: {
                students: {
                    include: { batches: true }
                }
            }
        });

        const overviews = [];
        for (const r of records) {
            if (!r.students) continue;
            const timeline = await buildStudentTimeline(r.students.id);
            if (timeline) {
                overviews.push({
                    student: r.students,
                    batch: r.students.batches,
                    currentMilestone: timeline.currentMilestone,
                    nextMilestone: timeline.nextMilestone,
                    timeline: timeline.timeline
                });
            }
        }

        res.status(200).json(overviews);
    } catch (error) {
        console.error("Supervisor Overview Error:", error);
        res.status(500).json({ error: "Failed to fetch supervisor milestone overview", details: error.message });
    }
};

// ======================================================
// GET ASSESSOR STUDENTS MILESTONE OVERVIEW
// ======================================================
exports.getAssessorMilestoneOverview = async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const assessor = await prisma.assessors.findUnique({ where: { email } });
        if (!assessor) return res.status(404).json({ error: "Assessor not found" });

        const records = await prisma.student_fyp_records.findMany({
            where: { assessor_id: assessor.id },
            include: {
                students: {
                    include: { batches: true }
                }
            }
        });

        const overviews = [];
        for (const r of records) {
            if (!r.students) continue;
            const timeline = await buildStudentTimeline(r.students.id);
            if (timeline) {
                // Assessors care about summative milestones
                const summativeMilestones = timeline.timeline.filter(m => m.type === "SUMMATIVE");
                overviews.push({
                    student: r.students,
                    batch: r.students.batches,
                    currentMilestone: timeline.currentMilestone,
                    summativeMilestones
                });
            }
        }

        res.status(200).json(overviews);
    } catch (error) {
        console.error("Assessor Overview Error:", error);
        res.status(500).json({ error: "Failed to fetch assessor milestone overview", details: error.message });
    }
};

// ======================================================
// HELPER: Build timeline for a student
// ======================================================
async function buildStudentTimeline(studentId) {
    const student = await prisma.students.findUnique({
        where: { id: studentId },
        include: { batches: true }
    });

    if (!student || !student.batch_id) return null;

    const milestones = await prisma.milestones.findMany({
        where: { batch_id: student.batch_id },
        orderBy: [{ order_index: "asc" }, { deadline: "asc" }]
    });

    if (milestones.length === 0) {
        return { student, currentMilestone: null, nextMilestone: null, timeline: [] };
    }

    const statuses = await prisma.student_milestone_status.findMany({
        where: { student_id: studentId }
    });
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.milestone_id] = s; });

    let currentMilestone = null;
    let nextMilestone = null;
    let currentFound = false;

    const timeline = milestones.map(m => {
        const s = statusMap[m.id];
        const storedStatus = s ? s.status : "Upcoming";
        const derived_status = deriveStatus(storedStatus, m.deadline);

        const item = {
            ...m,
            status_record: s || null,
            derived_status,
            is_current: false,
            is_next: false
        };

        // Current = first not fully resolved
        if (!currentFound && derived_status !== "Submitted" && derived_status !== "Graded") {
            item.is_current = true;
            currentMilestone = item;
            currentFound = true;
        }

        return item;
    });

    // Next = the milestone after the current one
    const currentIndex = timeline.findIndex(m => m.is_current);
    if (currentIndex !== -1 && currentIndex + 1 < timeline.length) {
        timeline[currentIndex + 1].is_next = true;
        nextMilestone = timeline[currentIndex + 1];
    }

    return { student, currentMilestone, nextMilestone, timeline };
}
