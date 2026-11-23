const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { APPROVED_FYP_TEMPLATE, getRubric } = require("../services/rubricCatalog");
const { parseColomboDate, formatColomboDate, toColomboInputString } = require("../utils/dateUtils");

// ======================================================
// STATUS DERIVATION LOGIC (centralised)
// ======================================================

/**
 * Derive a display status for a milestone item.
 * Priority: stored Submitted/Graded > TBC > Due Today > Due Soon > Overdue > Upcoming
 */
function deriveStatus(storedStatus, milestone) {
    if (storedStatus === "Submitted" || storedStatus === "Graded") {
        return storedStatus;
    }
    if (milestone.is_date_tbc || !milestone.deadline) {
        return "Date to be confirmed";
    }

    const now = new Date();
    const deadlineDate = new Date(milestone.deadline);
    const diffMs = deadlineDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Due Today";
    if (diffDays > 0 && diffDays <= 7) return "Due Soon";
    if (diffDays < 0) return "Overdue";
    return "Upcoming";
}

/**
 * Format milestone record for client response (adding formatted Colombo dates)
 */
function formatMilestoneRecord(m) {
    const rubric = m.rubric_key ? getRubric(m.rubric_key) : null;
    return {
        ...m,
        opening_date_formatted: m.opening_date ? formatColomboDate(m.opening_date) : "Date to be confirmed",
        deadline_formatted: m.deadline ? formatColomboDate(m.deadline) : "Date to be confirmed",
        assessment_start_formatted: m.assessment_start_date ? formatColomboDate(m.assessment_start_date) : null,
        assessment_end_formatted: m.assessment_end_date ? formatColomboDate(m.assessment_end_date) : null,
        colombo_input_opening: toColomboInputString(m.opening_date),
        colombo_input_deadline: toColomboInputString(m.deadline),
        colombo_input_assessment_start: toColomboInputString(m.assessment_start_date),
        colombo_input_assessment_end: toColomboInputString(m.assessment_end_date),
        rubric_criteria: rubric ? rubric.criteria : []
    };
}

// ======================================================
// 1. GET ALL MILESTONES BY BATCH (PM & Admin Dashboard)
// ======================================================
exports.getMilestonesByBatch = async (req, res) => {
    const batchId = Number(req.params.batchId);
    if (!Number.isSafeInteger(batchId) || batchId <= 0) return res.status(400).json({ error: "Invalid Batch ID" });

    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();
    const isStaff = ["PM", "ADMIN"].includes(userRole);

    try {
        const batch = await prisma.batches.findUnique({ where: { id: batchId }, select: { id: true } });
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        const whereClause = { batch_id: batchId };
        if (!isStaff) {
            // Non-staff only see published milestones
            whereClause.status = "PUBLISHED";
        }

        const milestones = await prisma.milestones.findMany({
            where: whereClause,
            include: {
                date_audit_logs: {
                    orderBy: { changed_at: "desc" },
                    take: 20
                }
            },
            orderBy: [{ order_index: "asc" }, { created_at: "asc" }]
        });

        const formatted = milestones.map(formatMilestoneRecord);
        res.status(200).json(formatted);
    } catch (error) {
        console.error("Get Milestones Error:", error);
        res.status(500).json({ error: "Failed to fetch milestones", details: error.message });
    }
};

// ======================================================
// 2. APPLY APPROVED FYP TEMPLATE (PM & Admin)
// ======================================================
exports.applyApprovedTemplate = async (req, res) => {
    const batchId = parseInt(req.params.batchId);
    if (isNaN(batchId)) return res.status(400).json({ error: "Invalid Batch ID" });

    const userEmail = (req.headers["x-user-email"] || "staff@apiit.lk").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();

    if (!["PM", "ADMIN"].includes(userRole)) {
        return res.status(403).json({ error: "Unauthorized: PM or Admin access required to configure milestone schedule." });
    }

    try {
        const batch = await prisma.batches.findUnique({ where: { id: batchId } });
        if (!batch) return res.status(404).json({ error: "Batch not found" });

        // Fetch existing milestones for this batch
        const existing = await prisma.milestones.findMany({
            where: { batch_id: batchId }
        });
        const existingCodeMap = new Set(existing.filter(m => m.milestone_code).map(m => m.milestone_code));

        let createdCount = 0;
        let preservedCount = 0;
        const newlyCreatedIds = [];

        // Transaction to ensure atomicity against simultaneous template calls
        await prisma.$transaction(async (tx) => {
            for (const tpl of APPROVED_FYP_TEMPLATE) {
                if (existingCodeMap.has(tpl.milestone_code)) {
                    preservedCount++;
                    continue;
                }

                // Create missing milestone as DRAFT with is_date_tbc = true
                const created = await tx.milestones.create({
                    data: {
                        batch_id: batchId,
                        milestone_code: tpl.milestone_code,
                        name: tpl.name,
                        semester: tpl.semester,
                        component: tpl.component,
                        type: tpl.type,
                        max_marks: tpl.max_marks,
                        rubric_key: tpl.rubric_key,
                        order_index: tpl.order_index,
                        student_instructions: tpl.student_instructions,
                        is_date_tbc: true,
                        status: "DRAFT",
                        created_by: userEmail
                    }
                });

                newlyCreatedIds.push(created.id);
                createdCount++;
            }

            // Seed student_milestone_status for all students in this batch for the new milestones
            if (newlyCreatedIds.length > 0) {
                const students = await tx.students.findMany({ where: { batch_id: batchId } });
                if (students.length > 0) {
                    const statusRecords = [];
                    for (const std of students) {
                        for (const mId of newlyCreatedIds) {
                            statusRecords.push({
                                student_id: std.id,
                                milestone_id: mId,
                                status: "Upcoming"
                            });
                        }
                    }
                    await tx.student_milestone_status.createMany({
                        data: statusRecords,
                        skipDuplicates: true
                    });
                }
            }
        });

        // Fetch updated list
        const updatedList = await prisma.milestones.findMany({
            where: { batch_id: batchId },
            include: { date_audit_logs: { orderBy: { changed_at: "desc" } } },
            orderBy: [{ order_index: "asc" }, { created_at: "asc" }]
        });

        res.status(200).json({
            message: `Template applied successfully. ${createdCount} milestones created, ${preservedCount} preserved without modification.`,
            createdCount,
            preservedCount,
            milestones: updatedList.map(formatMilestoneRecord)
        });
    } catch (error) {
        console.error("Apply Template Error:", error);
        res.status(500).json({ error: "Failed to apply milestone template", details: error.message });
    }
};

// ======================================================
// 3. CREATE INDIVIDUAL MILESTONE (PM & Admin)
// ======================================================
exports.createMilestone = async (req, res) => {
    const {
        batch_id,
        milestone_code,
        name,
        description,
        type,
        component,
        max_marks,
        rubric_key,
        semester,
        opening_date,
        deadline,
        assessment_start_date,
        assessment_end_date,
        is_date_tbc,
        student_instructions,
        lms_activity_url,
        status,
        order_index
    } = req.body;

    const batchId = Number(batch_id);
    if (!Number.isSafeInteger(batchId) || batchId <= 0 || typeof name !== 'string' || !name.trim() || !type) {
        return res.status(400).json({ error: "Missing required fields: batch_id, name, type" });
    }
    if (!["FORMATIVE", "SUMMATIVE"].includes(type)) {
        return res.status(400).json({ error: "type must be FORMATIVE or SUMMATIVE" });
    }

    const userEmail = (req.headers["x-user-email"] || "staff@apiit.lk").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();

    if (!["PM", "ADMIN"].includes(userRole)) {
        return res.status(403).json({ error: "Unauthorized: PM or Admin access required." });
    }

    try {
        const batch = await prisma.batches.findUnique({ where: { id: batchId }, select: { id: true } });
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        const parsedOpening = is_date_tbc ? null : parseColomboDate(opening_date);
        const parsedDeadline = is_date_tbc ? null : parseColomboDate(deadline);
        const parsedAssessStart = is_date_tbc ? null : parseColomboDate(assessment_start_date);
        const parsedAssessEnd = is_date_tbc ? null : parseColomboDate(assessment_end_date);

        if (!is_date_tbc && !parsedDeadline) {
            return res.status(400).json({ error: 'Enter a valid submission deadline or mark dates as to be confirmed.' });
        }
        if (!is_date_tbc && [[opening_date, parsedOpening], [assessment_start_date, parsedAssessStart], [assessment_end_date, parsedAssessEnd]].some(([input, parsed]) => input && !parsed)) {
            return res.status(400).json({ error: 'One or more milestone dates are invalid.' });
        }

        // A failed progress insert must roll back the milestone, allowing a safe retry.
        const milestone = await prisma.$transaction(async tx => {
            const created = await tx.milestones.create({
                data: {
                    batch_id: batchId,
                    milestone_code: milestone_code ? milestone_code.trim().toUpperCase() : null,
                    name: name.trim(),
                    description: description ? description.trim() : null,
                    type,
                    component: component || "Report",
                    max_marks: max_marks !== undefined ? parseFloat(max_marks) : 0,
                    rubric_key: rubric_key || null,
                    semester: semester || "Semester 1",
                    opening_date: parsedOpening,
                    deadline: parsedDeadline,
                    assessment_start_date: parsedAssessStart,
                    assessment_end_date: parsedAssessEnd,
                    is_date_tbc: Boolean(is_date_tbc || !parsedDeadline),
                    student_instructions: student_instructions ? student_instructions.trim() : null,
                    lms_activity_url: lms_activity_url ? lms_activity_url.trim() : null,
                    status: "DRAFT",
                    order_index: order_index !== undefined ? parseInt(order_index) : 0,
                    created_by: userEmail
                }
            });

            // Seed student status for all students in the batch
            const students = await tx.students.findMany({ where: { batch_id: batchId } });
            if (students.length > 0) {
                await tx.student_milestone_status.createMany({
                    data: students.map(s => ({
                        student_id: s.id,
                        milestone_id: created.id,
                        status: "Upcoming"
                    })),
                    skipDuplicates: true
                });
            }
            return created;
        });

        res.status(201).json({ message: "Milestone created successfully", milestone: formatMilestoneRecord(milestone) });
    } catch (error) {
        console.error("Create Milestone Error:", error);
        if (error.code === "P2002") {
            return res.status(409).json({ error: `A milestone with code '${milestone_code}' already exists for this batch.` });
        }
        res.status(500).json({ error: "Failed to create milestone", details: error.message });
    }
};

// ======================================================
// 4. UPDATE MILESTONE (PM & Admin)
// ======================================================
exports.updateMilestone = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid Milestone ID" });

    const userEmail = (req.headers["x-user-email"] || "staff@apiit.lk").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();

    if (!["PM", "ADMIN"].includes(userRole)) {
        return res.status(403).json({ error: "Unauthorized: PM or Admin access required." });
    }

    const {
        name,
        description,
        type,
        component,
        max_marks,
        rubric_key,
        semester,
        opening_date,
        deadline,
        assessment_start_date,
        assessment_end_date,
        is_date_tbc,
        student_instructions,
        lms_activity_url,
        status,
        order_index
    } = req.body;

    try {
        const existing = await prisma.milestones.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Milestone not found" });

        // Parse Colombo dates
        const parsedOpening = is_date_tbc ? null : (opening_date !== undefined ? parseColomboDate(opening_date) : existing.opening_date);
        const parsedDeadline = is_date_tbc ? null : (deadline !== undefined ? parseColomboDate(deadline) : existing.deadline);
        const parsedAssessStart = is_date_tbc ? null : (assessment_start_date !== undefined ? parseColomboDate(assessment_start_date) : existing.assessment_start_date);
        const parsedAssessEnd = is_date_tbc ? null : (assessment_end_date !== undefined ? parseColomboDate(assessment_end_date) : existing.assessment_end_date);

        // Track date audit logs
        const auditEntries = [];
        if (opening_date !== undefined && String(parsedOpening) !== String(existing.opening_date)) {
            auditEntries.push({
                milestone_id: id,
                changed_by: userEmail,
                field_name: "opening_date",
                old_value: existing.opening_date ? existing.opening_date.toISOString() : "None",
                new_value: parsedOpening ? parsedOpening.toISOString() : "None"
            });
        }
        if (deadline !== undefined && String(parsedDeadline) !== String(existing.deadline)) {
            auditEntries.push({
                milestone_id: id,
                changed_by: userEmail,
                field_name: "deadline",
                old_value: existing.deadline ? existing.deadline.toISOString() : "None",
                new_value: parsedDeadline ? parsedDeadline.toISOString() : "None"
            });
        }
        if (status && status !== existing.status) {
            auditEntries.push({
                milestone_id: id,
                changed_by: userEmail,
                field_name: "status",
                old_value: existing.status,
                new_value: status
            });
        }

        const milestone = await prisma.$transaction(async (tx) => {
            if (auditEntries.length > 0) {
                await tx.milestone_date_audit.createMany({ data: auditEntries });
            }

            return await tx.milestones.update({
                where: { id },
                data: {
                    ...(name && { name: name.trim() }),
                    ...(description !== undefined && { description: description ? description.trim() : null }),
                    ...(type && { type }),
                    ...(component && { component }),
                    ...(max_marks !== undefined && { max_marks: parseFloat(max_marks) }),
                    ...(rubric_key !== undefined && { rubric_key: rubric_key || null }),
                    ...(semester && { semester }),
                    opening_date: parsedOpening,
                    deadline: parsedDeadline,
                    assessment_start_date: parsedAssessStart,
                    assessment_end_date: parsedAssessEnd,
                    is_date_tbc: Boolean(is_date_tbc || !parsedDeadline),
                    ...(student_instructions !== undefined && { student_instructions: student_instructions ? student_instructions.trim() : null }),
                    ...(lms_activity_url !== undefined && { lms_activity_url: lms_activity_url ? lms_activity_url.trim() : null }),
                    ...(status && { status }),
                    ...(order_index !== undefined && { order_index: parseInt(order_index) }),
                    updated_by: userEmail
                },
                include: {
                    date_audit_logs: { orderBy: { changed_at: "desc" }, take: 10 }
                }
            });
        });

        // If published, ensure all batch students have status records
        if (milestone.status === "PUBLISHED") {
            const students = await prisma.students.findMany({ where: { batch_id: milestone.batch_id } });
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
        }

        res.status(200).json({ message: "Milestone updated successfully", milestone: formatMilestoneRecord(milestone) });
    } catch (error) {
        console.error("Update Milestone Error:", error);
        res.status(500).json({ error: "Failed to update milestone", details: error.message });
    }
};

// ======================================================
// 5. PUBLISH ALL BATCH MILESTONES (PM & Admin)
// ======================================================
exports.publishBatchMilestones = async (req, res) => {
    const batchId = parseInt(req.params.batchId);
    if (isNaN(batchId)) return res.status(400).json({ error: "Invalid Batch ID" });

    const userEmail = (req.headers["x-user-email"] || "staff@apiit.lk").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();

    if (!["PM", "ADMIN"].includes(userRole)) {
        return res.status(403).json({ error: "Unauthorized: PM or Admin access required." });
    }

    try {
        const updated = await prisma.milestones.updateMany({
            where: { batch_id: batchId, status: "DRAFT" },
            data: { status: "PUBLISHED", updated_by: userEmail }
        });

        // Ensure all students in the batch have statuses for all published milestones
        const allPublished = await prisma.milestones.findMany({
            where: { batch_id: batchId, status: "PUBLISHED" }
        });
        const students = await prisma.students.findMany({ where: { batch_id: batchId } });

        if (students.length > 0 && allPublished.length > 0) {
            const toCreate = [];
            for (const s of students) {
                for (const m of allPublished) {
                    toCreate.push({
                        student_id: s.id,
                        milestone_id: m.id,
                        status: "Upcoming"
                    });
                }
            }
            await prisma.student_milestone_status.createMany({
                data: toCreate,
                skipDuplicates: true
            });
        }

        res.status(200).json({
            message: `Successfully published ${updated.count} milestones to students.`,
            publishedCount: updated.count
        });
    } catch (error) {
        console.error("Publish Batch Milestones Error:", error);
        res.status(500).json({ error: "Failed to publish milestones", details: error.message });
    }
};

// ======================================================
// 6. DELETE MILESTONE (PM & Admin)
// ======================================================
exports.deleteMilestone = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid Milestone ID" });

    try {
        // Prevent deletion if academic marks/evaluations are already associated
        const hasEvaluations = await prisma.assessment_evaluations.findFirst({
            where: { milestone_id: id, status: "SUBMITTED" }
        });
        if (hasEvaluations) {
            return res.status(409).json({
                error: "Cannot delete milestone: Official submitted evaluations exist for this milestone. Academic history must be preserved."
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
// 7. GET STUDENT PROGRESS & TIMELINE (3 SEMESTERS + TOTALS)
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
// 8. HELPER: Build 3-Semester Timeline & Component Totals
// ======================================================
async function buildStudentTimeline(studentId) {
    const student = await prisma.students.findUnique({
        where: { id: studentId },
        include: { batches: true }
    });

    if (!student || !student.batch_id) return null;

    // Fetch ONLY published milestones for student visibility
    const milestones = await prisma.milestones.findMany({
        where: { batch_id: student.batch_id, status: "PUBLISHED" },
        orderBy: [{ order_index: "asc" }, { created_at: "asc" }]
    });

    if (milestones.length === 0) {
        return {
            student,
            currentMilestone: null,
            nextMilestone: null,
            timeline: [],
            semesters: { Preparation: [], "Semester 1": [], "Semester 2": [], "Semester 3": [] },
            componentTotals: {
                proposal: { confirmed: null, max: 20.0, isComplete: false },
                report: { confirmed: null, max: 60.0, isComplete: false },
                vivaPresentation: { confirmed: null, max: 20.0, isComplete: false },
                overall: { confirmed: null, max: 100.0, isProvisional: true }
            }
        };
    }

    // Ensure student has milestone status records
    const statuses = await prisma.student_milestone_status.findMany({
        where: { student_id: studentId }
    });
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.milestone_id] = s; });

    // Fetch released qualitative feedback for this student
    const releasedNotes = await prisma.reviewer_notes.findMany({
        where: {
            student_id: studentId,
            released_feedback: { not: null }
        }
    });
    const feedbackMap = {};
    releasedNotes.forEach(n => {
        if (!feedbackMap[n.stage]) feedbackMap[n.stage] = [];
        feedbackMap[n.stage].push({
            reviewerRole: n.reviewer_role,
            feedback: n.released_feedback,
            releasedAt: n.feedback_released_at
        });
    });

    // Fetch confirmed agreed marks from reconciliations
    const reconciliations = await prisma.milestone_reconciliations.findMany({
        where: {
            student_id: studentId,
            status: "AGREED_MARK_CONFIRMED"
        }
    });
    const confirmedMarkMap = {};
    reconciliations.forEach(r => {
        if (r.final_agreed_mark !== null) {
            confirmedMarkMap[r.milestone_id] = parseFloat(r.final_agreed_mark);
        }
    });

    let currentMilestone = null;
    let nextMilestone = null;
    let currentFound = false;

    const semesters = {
        Preparation: [],
        "Semester 1": [],
        "Semester 2": [],
        "Semester 3": []
    };

    const timeline = milestones.map(m => {
        const s = statusMap[m.id];
        const storedStatus = s ? s.status : "Upcoming";
        const derived_status = deriveStatus(storedStatus, m);

        const rubric = m.rubric_key ? getRubric(m.rubric_key) : null;
        const confirmedScore = confirmedMarkMap[m.id] !== undefined ? confirmedMarkMap[m.id] : null;

        // Feedback matching by stage/component
        const feedback = feedbackMap[m.name] || feedbackMap[m.component] || [];

        const item = {
            ...formatMilestoneRecord(m),
            status_record: s || null,
            derived_status,
            confirmed_score: confirmedScore,
            is_assessed: confirmedScore !== null,
            released_feedback: feedback,
            is_current: false,
            is_next: false
        };

        if (!currentFound && derived_status !== "Submitted" && derived_status !== "Graded") {
            item.is_current = true;
            currentMilestone = item;
            currentFound = true;
        }

        const semKey = m.semester || "Semester 1";
        if (semesters[semKey]) {
            semesters[semKey].push(item);
        } else {
            semesters["Semester 1"].push(item);
        }

        return item;
    });

    // Determine next milestone
    const currentIndex = timeline.findIndex(m => m.is_current);
    if (currentIndex !== -1 && currentIndex + 1 < timeline.length) {
        timeline[currentIndex + 1].is_next = true;
        nextMilestone = timeline[currentIndex + 1];
    }

    // ======================================================
    // Confirmed Component Totals Calculation:
    // Proposal = Final Proposal (5) + Midpoint (15) = 20
    // Report = Literature Review (5) + PoC (10) + Final Report (45) = 60
    // Viva Presentation = Demo Day (10) + Final Viva (10) = 20
    // Overall = 100
    // ======================================================
    let proposalConfirmed = 0;
    let proposalCount = 0;
    let reportConfirmed = 0;
    let reportCount = 0;
    let vivaConfirmed = 0;
    let vivaCount = 0;

    timeline.forEach(item => {
        if (item.confirmed_score !== null) {
            if (item.component === "Proposal") {
                proposalConfirmed += item.confirmed_score;
                proposalCount++;
            } else if (item.component === "Report") {
                reportConfirmed += item.confirmed_score;
                reportCount++;
            } else if (item.component === "Viva Presentation") {
                vivaConfirmed += item.confirmed_score;
                vivaCount++;
            }
        }
    });

    const isProposalComplete = proposalCount === 2; // Final Proposal + Midpoint
    const isReportComplete = reportCount === 3;     // Lit Review + PoC + Final Report
    const isVivaComplete = vivaCount === 2;       // Demo Day + Final Viva
    const isAllComplete = isProposalComplete && isReportComplete && isVivaComplete;

    const overallTotal = (proposalCount > 0 || reportCount > 0 || vivaCount > 0)
        ? (proposalConfirmed + reportConfirmed + vivaConfirmed)
        : null;

    const componentTotals = {
        proposal: {
            confirmed: proposalCount > 0 ? proposalConfirmed : null,
            max: 20.0,
            isComplete: isProposalComplete
        },
        report: {
            confirmed: reportCount > 0 ? reportConfirmed : null,
            max: 60.0,
            isComplete: isReportComplete
        },
        vivaPresentation: {
            confirmed: vivaCount > 0 ? vivaConfirmed : null,
            max: 20.0,
            isComplete: isVivaComplete
        },
        overall: {
            confirmed: overallTotal,
            max: 100.0,
            isProvisional: !isAllComplete
        }
    };

    return {
        student,
        currentMilestone,
        nextMilestone,
        timeline,
        semesters,
        componentTotals
    };
}

// ======================================================
// 9. SUPERVISOR & ASSESSOR MILESTONE OVERVIEWS
// ======================================================
exports.getSupervisorMilestoneOverview = async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const supervisor = await prisma.supervisors.findUnique({ where: { email } });
        if (!supervisor) return res.status(404).json({ error: "Supervisor not found" });

        const records = await prisma.student_fyp_records.findMany({
            where: { supervisor_id: supervisor.id },
            include: { students: { include: { batches: true } } }
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
                    timeline: timeline.timeline,
                    componentTotals: timeline.componentTotals
                });
            }
        }

        res.status(200).json(overviews);
    } catch (error) {
        console.error("Supervisor Overview Error:", error);
        res.status(500).json({ error: "Failed to fetch supervisor milestone overview", details: error.message });
    }
};

exports.getAssessorMilestoneOverview = async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const assessor = await prisma.assessors.findUnique({ where: { email } });
        if (!assessor) return res.status(404).json({ error: "Assessor not found" });

        const records = await prisma.student_fyp_records.findMany({
            where: { assessor_id: assessor.id },
            include: { students: { include: { batches: true } } }
        });

        const overviews = [];
        for (const r of records) {
            if (!r.students) continue;
            const timeline = await buildStudentTimeline(r.students.id);
            if (timeline) {
                const summativeMilestones = timeline.timeline.filter(m => m.type === "SUMMATIVE");
                overviews.push({
                    student: r.students,
                    batch: r.students.batches,
                    currentMilestone: timeline.currentMilestone,
                    summativeMilestones,
                    componentTotals: timeline.componentTotals
                });
            }
        }

        res.status(200).json(overviews);
    } catch (error) {
        console.error("Assessor Overview Error:", error);
        res.status(500).json({ error: "Failed to fetch assessor milestone overview", details: error.message });
    }
};
