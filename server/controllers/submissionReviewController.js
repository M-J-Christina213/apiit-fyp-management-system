const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const fs = require("fs");
const lmsAdapter = require("../services/lmsIntegrationAdapter");

/**
 * Helper: Verify reviewer or administrative authorization for a given student.
 * Checks whether the logged-in email belongs to:
 * 1. The assigned supervisor for this student in student_fyp_records.
 * 2. The assigned assessor for this student in student_fyp_records.
 * 3. An allocated viva supervisor or assessor in viva_schedules.
 * 4. A PM or Admin global role.
 */
async function getStudentReviewAuthorization(studentId, userEmail, userRole) {
    if (!studentId || !userEmail) {
        return { authorized: false, reason: "Missing credentials or student identifier" };
    }

    const normalizedEmail = userEmail.trim().toLowerCase();
    const normalizedRole = (userRole || "").trim().toUpperCase();

    // 1. Check if user is system admin or PM
    if (["ADMIN", "PM"].includes(normalizedRole)) {
        return {
            authorized: true,
            reviewerRelationship: normalizedRole === "ADMIN" ? "Admin" : "Project Manager",
            reviewerRole: normalizedRole,
            canEditNotes: true,
            canReleaseFeedback: true
        };
    }

    // 2. Fetch student with FYP records and viva schedules
    const student = await prisma.students.findUnique({
        where: { id: parseInt(studentId) },
        include: {
            batches: true,
            student_fyp_records: {
                include: {
                    supervisors: true,
                    assessors: true
                }
            },
            viva_schedules: {
                include: {
                    supervisors: true,
                    assessors: true
                }
            }
        }
    });

    if (!student) {
        return { authorized: false, reason: "Student record not found" };
    }

    // Check supervision in student_fyp_records
    const isDirectSupervisor = student.student_fyp_records.some(
        r => r.supervisors && r.supervisors.email?.trim().toLowerCase() === normalizedEmail
    );

    // Check assessment in student_fyp_records
    const isDirectAssessor = student.student_fyp_records.some(
        r => r.assessors && r.assessors.email?.trim().toLowerCase() === normalizedEmail
    );

    // Check viva allocation
    const isVivaSupervisor = student.viva_schedules.some(
        v => v.supervisors && v.supervisors.email?.trim().toLowerCase() === normalizedEmail
    );
    const isVivaAssessor = student.viva_schedules.some(
        v => v.assessors && v.assessors.email?.trim().toLowerCase() === normalizedEmail
    );

    const isSupervisor = isDirectSupervisor || isVivaSupervisor;
    const isAssessor = isDirectAssessor || isVivaAssessor;

    if (!isSupervisor && !isAssessor) {
        return {
            authorized: false,
            reason: "You are not assigned as a supervisor or assessor for this student."
        };
    }

    // Determine the primary relationship label
    let relationship = "Reviewer";
    let effectiveRole = "SUPERVISOR";

    if (isSupervisor && isAssessor) {
        relationship = "Supervisor & Assessor";
        effectiveRole = "SUPERVISOR";
    } else if (isSupervisor) {
        relationship = "Assigned Supervisor";
        effectiveRole = "SUPERVISOR";
    } else if (isAssessor) {
        relationship = "Assigned Assessor";
        effectiveRole = "ASSESSOR";
    }

    return {
        authorized: true,
        reviewerRelationship: relationship,
        reviewerRole: effectiveRole,
        student,
        canEditNotes: true,
        canReleaseFeedback: isSupervisor || ["ADMIN", "PM"].includes(normalizedRole)
    };
}

/**
 * 1. GET /api/submissions/review-workspace/:studentId
 * Returns student details, batch, project topic, available stages,
 * submissions list for the stage, LMS connection status, and reviewer's notes.
 */
exports.getReviewWorkspace = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const stage = req.query.stage || "Proposal";
        const userEmail = req.headers["x-user-email"];
        const userRole = req.headers["x-user-role"];

        if (isNaN(studentId)) {
            return res.status(400).json({ error: "Invalid Student ID" });
        }

        const auth = await getStudentReviewAuthorization(studentId, userEmail, userRole);
        if (!auth.authorized) {
            return res.status(403).json({ error: "Access Denied", message: auth.reason });
        }

        const student = auth.student || await prisma.students.findUnique({
            where: { id: studentId },
            include: {
                batches: true,
                student_fyp_records: {
                    include: { supervisors: true, assessors: true }
                }
            }
        });

        const fypRecord = student.student_fyp_records?.find(r => r.supervisor_id || r.assessor_id) || student.student_fyp_records?.[0];

        // Retrieve LMS course mapping for this batch and stage
        const courseMapping = student.batch_id ? await prisma.lms_course_mappings.findUnique({
            where: {
                batch_id_stage: {
                    batch_id: student.batch_id,
                    stage
                }
            }
        }) : null;

        // Retrieve submissions for this student and stage
        const submissions = await prisma.student_submissions.findMany({
            where: {
                student_id: studentId,
                stage
            },
            orderBy: [
                { version_number: "desc" },
                { created_at: "desc" }
            ]
        });

        // Retrieve reviewer's private notes and feedback for this student and stage
        const noteRecord = await prisma.reviewer_notes.findUnique({
            where: {
                student_id_reviewer_email_stage: {
                    student_id: studentId,
                    reviewer_email: userEmail.trim().toLowerCase(),
                    stage
                }
            }
        });

        const lmsStatus = lmsAdapter.getConnectionStatus();

        // Calculate available LMS activity URL for this batch & stage
        const lmsActivityUrl = courseMapping?.lms_activity_url ||
            (courseMapping?.lms_activity_id ? lmsAdapter.formatActivityUrl(courseMapping.lms_activity_id, courseMapping.lms_activity_type) : "https://lms.apiit.lk");

        res.status(200).json({
            student: {
                id: student.id,
                student_name: student.student_name,
                cb_no: student.cb_no,
                batch_id: student.batch_id,
                batch_code: student.batches?.batch_code || "N/A",
                batch_intake: student.batches?.batch_intake || "N/A",
                project_title: fypRecord?.tentative_topic || "FYP Project",
                supervisor_name: fypRecord?.supervisors ? `${fypRecord.supervisors.title || ""} ${fypRecord.supervisors.name}`.trim() : "Unassigned",
                assessor_name: fypRecord?.assessors ? `${fypRecord.assessors.title || ""} ${fypRecord.assessors.name}`.trim() : "Unassigned"
            },
            reviewerContext: {
                relationship: auth.reviewerRelationship,
                role: auth.reviewerRole,
                canReleaseFeedback: auth.canReleaseFeedback
            },
            stage,
            availableStages: ["Proposal", "Midpoint", "Final"],
            submissions: submissions.map(sub => ({
                id: sub.id,
                stage: sub.stage,
                title: sub.title || sub.file_name,
                file_name: sub.file_name,
                file_size_bytes: sub.file_size_bytes,
                file_type: sub.file_type,
                source: sub.source,
                version_number: sub.version_number,
                attempt_number: sub.attempt_number,
                submission_date: sub.submission_date,
                last_synced_at: sub.last_synced_at,
                sync_status: sub.sync_status,
                sync_error: sub.sync_error,
                lms_activity_url: sub.lms_activity_url || lmsActivityUrl
            })),
            notes: noteRecord ? {
                id: noteRecord.id,
                private_notes: noteRecord.private_notes || "",
                viva_questions: Array.isArray(noteRecord.viva_questions) ? noteRecord.viva_questions : [],
                draft_feedback: noteRecord.draft_feedback || "",
                released_feedback: noteRecord.released_feedback || "",
                feedback_released_at: noteRecord.feedback_released_at,
                feedback_released_by: noteRecord.feedback_released_by,
                submission_id: noteRecord.submission_id,
                submission_version: noteRecord.submission_version,
                page_reference: noteRecord.page_reference || "",
                version: noteRecord.version,
                updated_at: noteRecord.updated_at
            } : {
                id: null,
                private_notes: "",
                viva_questions: [],
                draft_feedback: "",
                released_feedback: "",
                feedback_released_at: null,
                feedback_released_by: null,
                submission_id: null,
                submission_version: null,
                page_reference: "",
                version: 0,
                updated_at: null
            },
            lmsIntegration: {
                ...lmsStatus,
                activityUrl: lmsActivityUrl,
                activityType: courseMapping?.lms_activity_type || "turnitintooltwo",
                courseMapping: courseMapping ? {
                    id: courseMapping.id,
                    lms_course_id: courseMapping.lms_course_id,
                    lms_course_name: courseMapping.lms_course_name,
                    lms_activity_id: courseMapping.lms_activity_id
                } : null
            }
        });
    } catch (error) {
        console.error("Get Review Workspace Error:", error);
        res.status(500).json({ error: "Failed to load review workspace", details: error.message });
    }
};

/**
 * 2. POST /api/submissions/upload-manual-copy
 * Allows authorized staff or students to upload a manual review-copy PDF/Doc fallback.
 */
exports.uploadManualReviewCopy = async (req, res) => {
    try {
        const studentId = parseInt(req.body.student_id);
        const stage = req.body.stage || "Proposal";
        const title = req.body.title || null;
        const userEmail = req.headers["x-user-email"];
        const userRole = req.headers["x-user-role"];

        if (isNaN(studentId)) {
            return res.status(400).json({ error: "Invalid Student ID" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const auth = await getStudentReviewAuthorization(studentId, userEmail, userRole);
        if (!auth.authorized) {
            // Check if student themselves is uploading their own document
            const isSelf = await prisma.students.findFirst({
                where: {
                    id: studentId,
                    cb_no: { equals: req.headers["x-user-cbno"] || "", mode: "insensitive" }
                }
            });
            if (!isSelf) {
                // Remove the uploaded file if unauthorized
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(403).json({ error: "Access Denied", message: auth.reason });
            }
        }

        // Get latest version number for this stage
        const latestSubmission = await prisma.student_submissions.findFirst({
            where: { student_id: studentId, stage },
            orderBy: { version_number: "desc" }
        });
        const nextVersion = (latestSubmission?.version_number || 0) + 1;

        // Relative path inside uploads
        const relativePath = path.join("uploads", "submissions", req.file.filename).replace(/\\/g, "/");

        const newSubmission = await prisma.student_submissions.create({
            data: {
                student_id: studentId,
                stage,
                title: title || req.file.originalname,
                file_name: req.file.originalname,
                file_path: relativePath,
                file_size_bytes: req.file.size,
                file_type: req.file.mimetype || path.extname(req.file.originalname),
                source: "MANUAL_REVIEW_COPY",
                version_number: nextVersion,
                attempt_number: nextVersion,
                submission_date: new Date(),
                sync_status: "SYNCED",
                uploaded_by_email: userEmail || "system"
            }
        });

        res.status(201).json({
            message: "Submission copy uploaded successfully.",
            submission: newSubmission
        });
    } catch (error) {
        console.error("Upload Submission Error:", error);
        res.status(500).json({ error: "Failed to upload submission copy", details: error.message });
    }
};

/**
 * 3. GET /api/submissions/:submissionId/file
 * Secure preview / stream of document. Enforces authorization.
 */
exports.getSubmissionFile = async (req, res) => {
    try {
        const submissionId = parseInt(req.params.submissionId);
        const userEmail = req.headers["x-user-email"];
        const userRole = req.headers["x-user-role"];
        const asDownload = req.query.download === "true";

        if (isNaN(submissionId)) {
            return res.status(400).json({ error: "Invalid Submission ID" });
        }

        const submission = await prisma.student_submissions.findUnique({
            where: { id: submissionId },
            include: { students: true }
        });

        if (!submission) {
            return res.status(404).json({ error: "Submission not found" });
        }

        // Enforce access control
        const auth = await getStudentReviewAuthorization(submission.student_id, userEmail, userRole);
        if (!auth.authorized) {
            return res.status(403).json({ error: "Access Denied: You are not authorized to view this student's submission." });
        }

        const fullPath = path.resolve(submission.file_path);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: "File not found on server storage." });
        }

        const ext = path.extname(submission.file_name).toLowerCase();
        let contentType = submission.file_type || "application/octet-stream";
        if (ext === ".pdf") contentType = "application/pdf";
        else if (ext === ".doc") contentType = "application/msword";
        else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        res.setHeader("Content-Type", contentType);
        if (asDownload) {
            res.setHeader("Content-Disposition", `attachment; filename="${submission.file_name}"`);
        } else {
            res.setHeader("Content-Disposition", `inline; filename="${submission.file_name}"`);
        }

        const stream = fs.createReadStream(fullPath);
        stream.pipe(res);
    } catch (error) {
        console.error("Stream Submission File Error:", error);
        res.status(500).json({ error: "Failed to stream file", details: error.message });
    }
};

/**
 * 4. POST /api/submissions/notes/save
 * Saves reviewer private notes and viva preparation questions with optimistic locking.
 * Notes are STRICTLY PRIVATE to the author (unique by student_id + reviewer_email + stage).
 */
exports.saveReviewerNotes = async (req, res) => {
    try {
        const {
            student_id,
            stage,
            private_notes,
            viva_questions,
            draft_feedback,
            submission_id,
            submission_version,
            page_reference,
            client_version
        } = req.body;

        const studentId = parseInt(student_id);
        const userEmail = req.headers["x-user-email"];
        const userRole = req.headers["x-user-role"];

        if (isNaN(studentId) || !stage || !userEmail) {
            return res.status(400).json({ error: "Missing required fields (student_id, stage, email)." });
        }

        const auth = await getStudentReviewAuthorization(studentId, userEmail, userRole);
        if (!auth.authorized) {
            return res.status(403).json({ error: "Access Denied", message: auth.reason });
        }

        const normalizedEmail = userEmail.trim().toLowerCase();

        // Check if note already exists
        const existingNote = await prisma.reviewer_notes.findUnique({
            where: {
                student_id_reviewer_email_stage: {
                    student_id: studentId,
                    reviewer_email: normalizedEmail,
                    stage
                }
            }
        });

        // Optimistic concurrency check
        if (existingNote && typeof client_version === "number" && client_version > 0) {
            if (existingNote.version !== client_version) {
                return res.status(409).json({
                    error: "Concurrency Conflict",
                    message: "These notes were modified in another window. Please refresh before saving to avoid overwriting edits.",
                    currentVersion: existingNote.version,
                    currentNote: existingNote
                });
            }
        }

        let savedNote;
        if (existingNote) {
            savedNote = await prisma.reviewer_notes.update({
                where: { id: existingNote.id },
                data: {
                    private_notes: private_notes !== undefined ? private_notes : existingNote.private_notes,
                    viva_questions: viva_questions !== undefined ? viva_questions : existingNote.viva_questions,
                    draft_feedback: draft_feedback !== undefined ? draft_feedback : existingNote.draft_feedback,
                    submission_id: submission_id !== undefined ? submission_id : existingNote.submission_id,
                    submission_version: submission_version !== undefined ? submission_version : existingNote.submission_version,
                    page_reference: page_reference !== undefined ? page_reference : existingNote.page_reference,
                    version: existingNote.version + 1,
                    updated_at: new Date()
                }
            });
        } else {
            savedNote = await prisma.reviewer_notes.create({
                data: {
                    student_id: studentId,
                    reviewer_email: normalizedEmail,
                    reviewer_role: auth.reviewerRole,
                    stage,
                    private_notes: private_notes || "",
                    viva_questions: viva_questions || [],
                    draft_feedback: draft_feedback || "",
                    submission_id: submission_id || null,
                    submission_version: submission_version || null,
                    page_reference: page_reference || "",
                    version: 1
                }
            });
        }

        res.status(200).json({
            message: "Notes saved successfully.",
            note: savedNote
        });
    } catch (error) {
        console.error("Save Reviewer Notes Error:", error);
        res.status(500).json({ error: "Failed to save reviewer notes", details: error.message });
    }
};

/**
 * 5. POST /api/submissions/feedback/release
 * Explicitly releases draft feedback to the student.
 * Only supervisor or authorized administrative roles can release official feedback.
 */
exports.releaseFeedback = async (req, res) => {
    try {
        const { student_id, stage, feedback_content } = req.body;
        const studentId = parseInt(student_id);
        const userEmail = req.headers["x-user-email"];
        const userRole = req.headers["x-user-role"];

        if (isNaN(studentId) || !stage || !userEmail) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const auth = await getStudentReviewAuthorization(studentId, userEmail, userRole);
        if (!auth.authorized || !auth.canReleaseFeedback) {
            return res.status(403).json({
                error: "Access Denied",
                message: "Only the designated supervisor or FYP administrator is authorized to release student feedback."
            });
        }

        const normalizedEmail = userEmail.trim().toLowerCase();

        const updated = await prisma.reviewer_notes.upsert({
            where: {
                student_id_reviewer_email_stage: {
                    student_id: studentId,
                    reviewer_email: normalizedEmail,
                    stage
                }
            },
            update: {
                released_feedback: feedback_content,
                feedback_released_at: new Date(),
                feedback_released_by: normalizedEmail,
                updated_at: new Date()
            },
            create: {
                student_id: studentId,
                reviewer_email: normalizedEmail,
                reviewer_role: auth.reviewerRole,
                stage,
                draft_feedback: feedback_content,
                released_feedback: feedback_content,
                feedback_released_at: new Date(),
                feedback_released_by: normalizedEmail
            }
        });

        res.status(200).json({
            message: "Feedback released to student successfully.",
            released_feedback: updated.released_feedback,
            released_at: updated.feedback_released_at
        });
    } catch (error) {
        console.error("Release Feedback Error:", error);
        res.status(500).json({ error: "Failed to release feedback", details: error.message });
    }
};

/**
 * 6. POST /api/submissions/lms/sync
 * Idempotent sync trigger. Returns honest sync status and respects student allocations.
 */
exports.syncWithLms = async (req, res) => {
    try {
        const { student_id, stage } = req.body;
        const studentId = parseInt(student_id);
        const userEmail = req.headers["x-user-email"];
        const userRole = req.headers["x-user-role"];

        if (isNaN(studentId) || !stage) {
            return res.status(400).json({ error: "Missing student_id or stage." });
        }

        const auth = await getStudentReviewAuthorization(studentId, userEmail, userRole);
        if (!auth.authorized) {
            return res.status(403).json({ error: "Access Denied", message: auth.reason });
        }

        const student = auth.student || await prisma.students.findUnique({
            where: { id: studentId },
            include: { batches: true }
        });

        const courseMapping = student.batch_id ? await prisma.lms_course_mappings.findUnique({
            where: {
                batch_id_stage: {
                    batch_id: student.batch_id,
                    stage
                }
            }
        }) : null;

        const syncResult = await lmsAdapter.syncStudentSubmission({
            studentId,
            cbNo: student.cb_no,
            batchId: student.batch_id,
            stage,
            courseMapping
        });

        res.status(200).json(syncResult);
    } catch (error) {
        console.error("LMS Sync Error:", error);
        res.status(500).json({ error: "LMS Sync encountered an error", details: error.message });
    }
};

/**
 * 7. Admin / PM: GET and POST LMS Course Mappings
 */
exports.getLmsMappings = async (req, res) => {
    try {
        const mappings = await prisma.lms_course_mappings.findMany({
            include: { batches: true },
            orderBy: { created_at: "desc" }
        });
        res.status(200).json(mappings);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch mappings", details: error.message });
    }
};

exports.saveLmsMapping = async (req, res) => {
    try {
        const { batch_id, stage, lms_course_id, lms_course_name, lms_activity_id, lms_activity_type, lms_activity_url, assignment_part } = req.body;

        if (!batch_id || !stage) {
            return res.status(400).json({ error: "Missing batch_id or stage." });
        }

        const mapping = await prisma.lms_course_mappings.upsert({
            where: {
                batch_id_stage: {
                    batch_id: parseInt(batch_id),
                    stage
                }
            },
            update: {
                lms_course_id,
                lms_course_name,
                lms_activity_id,
                lms_activity_type: lms_activity_type || "turnitintooltwo",
                lms_activity_url,
                assignment_part
            },
            create: {
                batch_id: parseInt(batch_id),
                stage,
                lms_course_id,
                lms_course_name,
                lms_activity_id,
                lms_activity_type: lms_activity_type || "turnitintooltwo",
                lms_activity_url,
                assignment_part
            }
        });

        res.status(200).json({ message: "LMS mapping saved.", mapping });
    } catch (error) {
        res.status(500).json({ error: "Failed to save LMS mapping", details: error.message });
    }
};

/**
 * 8. GET /api/submissions/student/feedback/:studentId
 * Allows a student to view only their explicitly released feedback.
 * Private reviewer notes and unasked viva questions are never returned.
 */
exports.getStudentReleasedFeedback = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const stage = req.query.stage || "Proposal";

        if (isNaN(studentId)) {
            return res.status(400).json({ error: "Invalid Student ID" });
        }

        const notes = await prisma.reviewer_notes.findMany({
            where: {
                student_id: studentId,
                stage,
                released_feedback: { not: null }
            },
            select: {
                id: true,
                reviewer_role: true,
                stage: true,
                released_feedback: true,
                feedback_released_at: true
            }
        });

        res.status(200).json(notes);
    } catch (error) {
        console.error("Get Student Released Feedback Error:", error);
        res.status(500).json({ error: "Failed to load released feedback", details: error.message });
    }
};

