const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getRubric } = require("../services/rubricCatalog");

// ======================================================
// Helper: Resolve student ID from CB number or integer
// ======================================================
async function resolveStudentId(rawId) {
    if (!rawId) return null;
    const parsed = parseInt(rawId);
    if (!isNaN(parsed)) return parsed;

    const student = await prisma.students.findFirst({
        where: { cb_no: { equals: String(rawId).trim(), mode: "insensitive" } }
    });
    return student ? student.id : null;
}

// ======================================================
// 1. GET MARKING WORKSPACE DATA
// Resolves student, milestone, rubric, and examiner drafts
// ======================================================
exports.getMarkingWorkspace = async (req, res) => {
    const studentId = await resolveStudentId(req.params.studentId);
    const milestoneId = parseInt(req.params.milestoneId);
    const vivaScheduleId = req.query.vivaScheduleId ? parseInt(req.query.vivaScheduleId) : null;

    if (!studentId || isNaN(milestoneId)) {
        return res.status(400).json({ error: "Invalid Student ID or Milestone ID." });
    }

    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();

    try {
        const student = await prisma.students.findUnique({
            where: { id: studentId },
            include: {
                batches: true,
                student_fyp_records: {
                    include: { supervisors: true, assessors: true }
                }
            }
        });
        if (!student) return res.status(404).json({ error: "Student not found." });

        const milestone = await prisma.milestones.findUnique({
            where: { id: milestoneId }
        });
        if (!milestone) return res.status(404).json({ error: "Milestone not found." });

        // Resolve rubric
        const rubricKey = milestone.rubric_key || "SEM1_LR";
        const rubric = getRubric(rubricKey);
        if (!rubric) return res.status(404).json({ error: `Rubric for key '${rubricKey}' not found.` });

        // Verify examiner role and relationship
        const fypRecord = student.student_fyp_records[0];
        const isSupervisor = fypRecord?.supervisors?.email?.trim().toLowerCase() === userEmail;
        const isAssessor = fypRecord?.assessors?.email?.trim().toLowerCase() === userEmail;
        const isStaffAdmin = ["PM", "ADMIN"].includes(userRole);

        let examinerCapacity = isSupervisor ? "SUPERVISOR" : (isAssessor ? "ASSESSOR" : (isStaffAdmin ? userRole : "REVIEWER"));

        // If viva schedule is associated, verify
        let vivaSchedule = null;
        if (vivaScheduleId) {
            vivaSchedule = await prisma.viva_schedules.findUnique({
                where: { id: vivaScheduleId },
                include: { viva_periods: true, supervisors: true, assessors: true }
            });
            if (vivaSchedule && vivaSchedule.student_id !== studentId) {
                return res.status(400).json({ error: "The provided viva schedule does not belong to this student." });
            }
            if (vivaSchedule?.supervisors?.email?.trim().toLowerCase() === userEmail) {
                examinerCapacity = "SUPERVISOR";
            } else if (vivaSchedule?.assessors?.email?.trim().toLowerCase() === userEmail) {
                examinerCapacity = "ASSESSOR";
            }
        }

        // Fetch the calling examiner's draft evaluation
        const myEvaluation = await prisma.assessment_evaluations.findUnique({
            where: {
                milestone_id_student_id_examiner_email: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    examiner_email: userEmail
                }
            }
        });

        // Check joint-marking comparison status
        const allEvaluations = await prisma.assessment_evaluations.findMany({
            where: {
                milestone_id: milestoneId,
                student_id: studentId
            }
        });

        const supervisorEval = allEvaluations.find(e => e.examiner_role === "SUPERVISOR");
        const assessorEval = allEvaluations.find(e => e.examiner_role === "ASSESSOR");
        const thirdMarkerEval = allEvaluations.find(e => e.examiner_role === "THIRD_MARKER");

        const bothSubmitted = Boolean(
            supervisorEval && supervisorEval.status === "SUBMITTED" &&
            assessorEval && assessorEval.status === "SUBMITTED"
        );

        // Fetch reconciliation record and proposals
        const reconciliation = await prisma.milestone_reconciliations.findUnique({
            where: {
                milestone_id_student_id: {
                    milestone_id: milestoneId,
                    student_id: studentId
                }
            },
            include: {
                proposals: { orderBy: { version: "desc" } }
            }
        });

        // Build side-by-side comparison payload (strictly redacting author-only private notes)
        let comparison = null;
        if (bothSubmitted) {
            comparison = {
                supervisor: {
                    examinerEmail: supervisorEval.examiner_email,
                    examinerName: supervisorEval.examiner_name,
                    totalScore: supervisorEval.total_score,
                    criterionScores: supervisorEval.criterion_scores,
                    sharedRationale: supervisorEval.shared_rationale,
                    submittedAt: supervisorEval.submitted_at
                },
                assessor: {
                    examinerEmail: assessorEval.examiner_email,
                    examinerName: assessorEval.examiner_name,
                    totalScore: assessorEval.total_score,
                    criterionScores: assessorEval.criterion_scores,
                    sharedRationale: assessorEval.shared_rationale,
                    submittedAt: assessorEval.submitted_at
                },
                thirdMarker: thirdMarkerEval ? {
                    examinerEmail: thirdMarkerEval.examiner_email,
                    examinerName: thirdMarkerEval.examiner_name,
                    totalScore: thirdMarkerEval.total_score,
                    criterionScores: thirdMarkerEval.criterion_scores,
                    sharedRationale: thirdMarkerEval.shared_rationale,
                    submittedAt: thirdMarkerEval.submitted_at
                } : null,
                scoreDifference: Math.abs(parseFloat(supervisorEval.total_score || 0) - parseFloat(assessorEval.total_score || 0)),
                reconciliation
            };
        }

        res.status(200).json({
            student: {
                id: student.id,
                name: student.student_name,
                cbNo: student.cb_no,
                batch: student.batches
            },
            milestone: {
                id: milestone.id,
                code: milestone.milestone_code,
                name: milestone.name,
                component: milestone.component,
                maxMarks: parseFloat(milestone.max_marks || rubric.maxMarks),
                semester: milestone.semester
            },
            vivaSchedule,
            rubric,
            examinerCapacity,
            myEvaluation: myEvaluation ? {
                ...myEvaluation,
                total_score: myEvaluation.total_score ? parseFloat(myEvaluation.total_score) : null
            } : null,
            bothSubmitted,
            comparison
        });
    } catch (error) {
        console.error("Get Marking Workspace Error:", error);
        res.status(500).json({ error: "Failed to load marking workspace.", details: error.message });
    }
};

// ======================================================
// 2. SAVE INCOMPLETE DRAFT EVALUATION (Autosave & Concurrent Safe)
// ======================================================
exports.saveDraft = async (req, res) => {
    const {
        student_id,
        milestone_id,
        viva_schedule_id,
        criterion_scores,
        shared_rationale,
        private_notes,
        client_version
    } = req.body;

    const studentId = await resolveStudentId(student_id);
    const milestoneId = parseInt(milestone_id);

    if (!studentId || isNaN(milestoneId)) {
        return res.status(400).json({ error: "student_id and milestone_id required." });
    }

    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "SUPERVISOR").trim().toUpperCase();

    if (!userEmail) {
        return res.status(401).json({ error: "Authenticated user email required to save marking." });
    }

    try {
        const milestone = await prisma.milestones.findUnique({ where: { id: milestoneId } });
        if (!milestone) return res.status(404).json({ error: "Milestone not found." });

        const rubricKey = milestone.rubric_key || "SEM1_LR";
        const rubric = getRubric(rubricKey);

        // Check if existing evaluation exists
        const existing = await prisma.assessment_evaluations.findUnique({
            where: {
                milestone_id_student_id_examiner_email: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    examiner_email: userEmail
                }
            }
        });

        // Guard: cannot edit already submitted evaluation
        if (existing && existing.status === "SUBMITTED") {
            return res.status(400).json({
                error: "Evaluation Locked",
                message: "This evaluation has already been formally submitted and cannot be modified."
            });
        }

        // Optimistic concurrency check (Dual-tab / out-of-order write protection)
        if (existing && typeof client_version === "number" && client_version > 0) {
            if (existing.version !== client_version) {
                return res.status(409).json({
                    error: "Concurrency Conflict",
                    message: "These marks were modified in another tab or window. Your latest changes have been preserved in your form; please review before resaving.",
                    currentVersion: existing.version,
                    currentDraft: existing
                });
            }
        }

        // Calculate running total safely from scores
        let runningTotal = 0;
        let hasAnyScore = false;
        if (Array.isArray(criterion_scores)) {
            criterion_scores.forEach(c => {
                if (c && c.awarded_score !== null && c.awarded_score !== undefined && c.awarded_score !== "") {
                    const s = parseFloat(c.awarded_score);
                    if (!isNaN(s)) {
                        runningTotal += s;
                        hasAnyScore = true;
                    }
                }
            });
        }

        const totalScore = hasAnyScore ? parseFloat(runningTotal.toFixed(2)) : null;

        const nextVersion = existing ? existing.version + 1 : 1;

        const saved = await prisma.assessment_evaluations.upsert({
            where: {
                milestone_id_student_id_examiner_email: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    examiner_email: userEmail
                }
            },
            update: {
                criterion_scores: criterion_scores || [],
                total_score: totalScore,
                shared_rationale: shared_rationale !== undefined ? shared_rationale : existing?.shared_rationale,
                private_notes: private_notes !== undefined ? private_notes : existing?.private_notes,
                version: nextVersion,
                viva_schedule_id: viva_schedule_id ? parseInt(viva_schedule_id) : existing?.viva_schedule_id,
                updated_at: new Date()
            },
            create: {
                milestone_id: milestoneId,
                student_id: studentId,
                viva_schedule_id: viva_schedule_id ? parseInt(viva_schedule_id) : null,
                examiner_email: userEmail,
                examiner_role: userRole,
                rubric_key: rubricKey,
                rubric_version: 1,
                criterion_scores: criterion_scores || [],
                total_score: totalScore,
                shared_rationale: shared_rationale || "",
                private_notes: private_notes || "",
                status: "DRAFT",
                version: 1
            }
        });

        res.status(200).json({
            message: "Draft saved successfully.",
            saveStatus: "saved",
            evaluation: {
                ...saved,
                total_score: saved.total_score ? parseFloat(saved.total_score) : null
            }
        });
    } catch (error) {
        console.error("Save Draft Error:", error);
        res.status(500).json({ error: "Failed to save draft evaluation.", details: error.message });
    }
};

// ======================================================
// 3. FINAL SUBMISSION OF EVALUATION
// Validates rubric completeness, bounds, rationale, and creates immutable snapshot
// ======================================================
exports.submitEvaluation = async (req, res) => {
    const {
        student_id,
        milestone_id,
        viva_schedule_id,
        criterion_scores,
        shared_rationale,
        private_notes,
        client_version
    } = req.body;

    const studentId = await resolveStudentId(student_id);
    const milestoneId = parseInt(milestone_id);

    if (!studentId || isNaN(milestoneId)) {
        return res.status(400).json({ error: "student_id and milestone_id required." });
    }

    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "SUPERVISOR").trim().toUpperCase();

    try {
        const milestone = await prisma.milestones.findUnique({ where: { id: milestoneId } });
        if (!milestone) return res.status(404).json({ error: "Milestone not found." });

        const rubricKey = milestone.rubric_key || "SEM1_LR";
        const rubric = getRubric(rubricKey);
        if (!rubric) return res.status(404).json({ error: "Rubric not found." });

        // Validate criterion scores completeness against server rubric
        if (!Array.isArray(criterion_scores) || criterion_scores.length < rubric.criteria.length) {
            return res.status(400).json({
                error: "Incomplete Rubric",
                message: `All ${rubric.criteria.length} criteria must be scored before final submission.`
            });
        }

        let calculatedTotal = 0;
        const validatedScores = [];

        for (const crit of rubric.criteria) {
            const entered = criterion_scores.find(c => c && c.criterion_id === crit.id);
            if (!entered || entered.awarded_score === null || entered.awarded_score === undefined || entered.awarded_score === "") {
                return res.status(400).json({
                    error: "Missing Criterion Score",
                    message: `Criterion '${crit.name}' has not been scored.`
                });
            }

            const score = parseFloat(entered.awarded_score);
            if (isNaN(score) || score < 0 || score > crit.maxScore) {
                return res.status(400).json({
                    error: "Invalid Score Range",
                    message: `Score for '${crit.name}' must be between 0.00 and ${crit.maxScore}. Received: ${entered.awarded_score}`
                });
            }

            calculatedTotal += score;
            validatedScores.push({
                criterion_id: crit.id,
                criterion_name: crit.name,
                max_score: crit.maxScore,
                awarded_score: score,
                rationale: (entered.rationale || "").trim()
            });
        }

        // Validate shared rationale
        if (!shared_rationale || shared_rationale.trim().length < 5) {
            return res.status(400).json({
                error: "Missing Shared Marking Rationale",
                message: "Please provide an internal marking rationale explaining the justification for your marks."
            });
        }

        const finalTotal = parseFloat(calculatedTotal.toFixed(2));

        // Submit evaluation atomically
        const submitted = await prisma.assessment_evaluations.upsert({
            where: {
                milestone_id_student_id_examiner_email: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    examiner_email: userEmail
                }
            },
            update: {
                criterion_scores: validatedScores,
                total_score: finalTotal,
                shared_rationale: shared_rationale.trim(),
                private_notes: private_notes !== undefined ? private_notes : "",
                rubric_snapshot: rubric,
                status: "SUBMITTED",
                submitted_at: new Date(),
                version: { increment: 1 }
            },
            create: {
                milestone_id: milestoneId,
                student_id: studentId,
                viva_schedule_id: viva_schedule_id ? parseInt(viva_schedule_id) : null,
                examiner_email: userEmail,
                examiner_role: userRole,
                rubric_key: rubricKey,
                rubric_version: 1,
                rubric_snapshot: rubric,
                criterion_scores: validatedScores,
                total_score: finalTotal,
                shared_rationale: shared_rationale.trim(),
                private_notes: private_notes || "",
                status: "SUBMITTED",
                submitted_at: new Date(),
                version: 1
            }
        });

        // Check if other evaluations exist to trigger reconciliation
        const allEvals = await prisma.assessment_evaluations.findMany({
            where: { milestone_id: milestoneId, student_id: studentId, status: "SUBMITTED" }
        });

        const supervisorEval = allEvals.find(e => e.examiner_role === "SUPERVISOR");
        const assessorEval = allEvals.find(e => e.examiner_role === "ASSESSOR");

        // Single-marker milestones auto-complete directly
        if (rubric.markingMode === "SINGLE_MARKER") {
            await prisma.milestone_reconciliations.upsert({
                where: {
                    milestone_id_student_id: {
                        milestone_id: milestoneId,
                        student_id: studentId
                    }
                },
                update: {
                    status: "AGREED_MARK_CONFIRMED",
                    final_agreed_mark: finalTotal
                },
                create: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    status: "AGREED_MARK_CONFIRMED",
                    final_agreed_mark: finalTotal
                }
            });

            await prisma.student_milestone_status.upsert({
                where: {
                    student_id_milestone_id: {
                        student_id: studentId,
                        milestone_id: milestoneId
                    }
                },
                update: { status: "Graded" },
                create: {
                    student_id: studentId,
                    milestone_id: milestoneId,
                    status: "Graded"
                }
            });
        } else if (supervisorEval && assessorEval) {
            // Jointly marked milestone: Both submitted -> start reconciliation
            await prisma.milestone_reconciliations.upsert({
                where: {
                    milestone_id_student_id: {
                        milestone_id: milestoneId,
                        student_id: studentId
                    }
                },
                update: {
                    status: "UNDER_RECONCILIATION",
                    clock_started_at: new Date()
                },
                create: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    status: "UNDER_RECONCILIATION",
                    clock_started_at: new Date()
                }
            });
        }

        res.status(200).json({
            message: "Evaluation submitted successfully. Your marks and rationale are now recorded.",
            evaluation: submitted
        });
    } catch (error) {
        console.error("Submit Evaluation Error:", error);
        res.status(500).json({ error: "Failed to submit evaluation.", details: error.message });
    }
};

// ======================================================
// 4. PROPOSE AGREED MARK (Joint Reconciliation)
// ======================================================
exports.proposeAgreedMark = async (req, res) => {
    const { student_id, milestone_id, proposed_mark, discussion_notes } = req.body;
    const studentId = await resolveStudentId(student_id);
    const milestoneId = parseInt(milestone_id);

    if (!studentId || isNaN(milestoneId) || proposed_mark === undefined) {
        return res.status(400).json({ error: "student_id, milestone_id, and proposed_mark required." });
    }

    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "SUPERVISOR").trim().toUpperCase();

    const mark = parseFloat(proposed_mark);
    if (isNaN(mark) || mark < 0) {
        return res.status(400).json({ error: "Invalid proposed mark." });
    }

    try {
        let reconciliation = await prisma.milestone_reconciliations.findUnique({
            where: {
                milestone_id_student_id: {
                    milestone_id: milestoneId,
                    student_id: studentId
                }
            },
            include: { proposals: { orderBy: { version: "desc" }, take: 1 } }
        });

        if (!reconciliation) {
            reconciliation = await prisma.milestone_reconciliations.create({
                data: {
                    milestone_id: milestoneId,
                    student_id: studentId,
                    status: "UNDER_RECONCILIATION"
                },
                include: { proposals: true }
            });
        }

        const latestVersion = reconciliation.proposals && reconciliation.proposals.length > 0
            ? reconciliation.proposals[0].version + 1
            : 1;

        const isSupervisor = userRole === "SUPERVISOR";

        // Create new proposal version: proposer confirmed, other pending
        const newProposal = await prisma.agreement_proposals.create({
            data: {
                reconciliation_id: reconciliation.id,
                version: latestVersion,
                proposed_by_email: userEmail,
                proposed_by_role: userRole,
                proposed_mark: mark,
                discussion_notes: discussion_notes ? discussion_notes.trim() : "",
                supervisor_confirmed: isSupervisor,
                supervisor_conf_at: isSupervisor ? new Date() : null,
                supervisor_conf_by: isSupervisor ? userEmail : null,
                assessor_confirmed: !isSupervisor,
                assessor_conf_at: !isSupervisor ? new Date() : null,
                assessor_conf_by: !isSupervisor ? userEmail : null
            }
        });

        res.status(200).json({
            message: `Agreed mark of ${mark} proposed (Version ${latestVersion}). Awaiting confirmation from co-examiner.`,
            proposal: newProposal
        });
    } catch (error) {
        console.error("Propose Agreed Mark Error:", error);
        res.status(500).json({ error: "Failed to propose agreed mark.", details: error.message });
    }
};

// ======================================================
// 5. CONFIRM AGREED MARK (Joint Reconciliation)
// ======================================================
exports.confirmAgreedMark = async (req, res) => {
    const { student_id, milestone_id, proposal_version } = req.body;
    const studentId = await resolveStudentId(student_id);
    const milestoneId = parseInt(milestone_id);

    if (!studentId || isNaN(milestoneId) || !proposal_version) {
        return res.status(400).json({ error: "student_id, milestone_id, and proposal_version required." });
    }

    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "ASSESSOR").trim().toUpperCase();

    try {
        const reconciliation = await prisma.milestone_reconciliations.findUnique({
            where: {
                milestone_id_student_id: {
                    milestone_id: milestoneId,
                    student_id: studentId
                }
            },
            include: {
                proposals: {
                    where: { version: parseInt(proposal_version) },
                    take: 1
                }
            }
        });

        if (!reconciliation || reconciliation.proposals.length === 0) {
            return res.status(404).json({ error: "Proposal version not found." });
        }

        const proposal = reconciliation.proposals[0];
        const isSupervisor = userRole === "SUPERVISOR";

        const updateData = isSupervisor
            ? { supervisor_confirmed: true, supervisor_conf_at: new Date(), supervisor_conf_by: userEmail }
            : { assessor_confirmed: true, assessor_conf_at: new Date(), assessor_conf_by: userEmail };

        const updatedProposal = await prisma.agreement_proposals.update({
            where: { id: proposal.id },
            data: updateData
        });

        // Check if BOTH examiners have confirmed this exact version
        const bothConfirmed = updatedProposal.supervisor_confirmed && updatedProposal.assessor_confirmed;

        if (bothConfirmed) {
            await prisma.milestone_reconciliations.update({
                where: { id: reconciliation.id },
                data: {
                    status: "AGREED_MARK_CONFIRMED",
                    final_agreed_mark: updatedProposal.proposed_mark
                }
            });

            await prisma.student_milestone_status.upsert({
                where: {
                    student_id_milestone_id: {
                        student_id: studentId,
                        milestone_id: milestoneId
                    }
                },
                update: { status: "Graded" },
                create: {
                    student_id: studentId,
                    milestone_id: milestoneId,
                    status: "Graded"
                }
            });
        }

        res.status(200).json({
            message: bothConfirmed
                ? `Both examiners confirmed agreed mark of ${updatedProposal.proposed_mark}. Milestone mark is finalized.`
                : "Agreed mark proposal confirmed. Awaiting final confirmation.",
            bothConfirmed,
            proposal: updatedProposal
        });
    } catch (error) {
        console.error("Confirm Agreed Mark Error:", error);
        res.status(500).json({ error: "Failed to confirm agreed mark.", details: error.message });
    }
};

// ======================================================
// 6. CHECK RECONCILIATION DEADLINE & REFERRAL TRIGGER
// If agreement deadline expired and unresolved -> flag for Head
// ======================================================
exports.checkReconciliationExpiry = async (req, res) => {
    try {
        const now = new Date();
        const expiredUnresolved = await prisma.milestone_reconciliations.findMany({
            where: {
                status: "UNDER_RECONCILIATION",
                reconciliation_deadline: { lt: now }
            }
        });

        let updatedCount = 0;
        for (const r of expiredUnresolved) {
            await prisma.milestone_reconciliations.update({
                where: { id: r.id },
                data: { status: "AWAITING_THIRD_MARKER" }
            });
            updatedCount++;
        }

        res.status(200).json({
            message: `Expiry check complete. ${updatedCount} unresolved cases referred for Third Marker Assignment.`,
            referredCount: updatedCount
        });
    } catch (error) {
        console.error("Reconciliation Expiry Check Error:", error);
        res.status(500).json({ error: "Failed to check reconciliation expiry.", details: error.message });
    }
};

// ======================================================
// 7. ASSIGN THIRD MARKER (HEAD OF SCHOOL OF COMPUTING ONLY)
// ======================================================
exports.assignThirdMarker = async (req, res) => {
    const { student_id, milestone_id, third_marker_email, third_marker_name } = req.body;
    const studentId = await resolveStudentId(student_id);
    const milestoneId = parseInt(milestone_id);

    if (!studentId || isNaN(milestoneId) || !third_marker_email) {
        return res.status(400).json({ error: "student_id, milestone_id, and third_marker_email required." });
    }

    const userEmail = (req.headers["x-user-email"] || "").trim().toLowerCase();
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();

    // Verify Head of School of Computing authorization
    const isHead = ["ADMIN", "HEAD_OF_COMPUTING"].includes(userRole);
    if (!isHead) {
        return res.status(403).json({ error: "Unauthorized: Only the Head of the School of Computing can assign a Third Marker." });
    }

    try {
        const student = await prisma.students.findUnique({
            where: { id: studentId },
            include: { student_fyp_records: { include: { supervisors: true, assessors: true } } }
        });

        const supervisorEmail = student?.student_fyp_records[0]?.supervisors?.email?.trim().toLowerCase();
        const assessorEmail = student?.student_fyp_records[0]?.assessors?.email?.trim().toLowerCase();
        const normalizedThirdEmail = third_marker_email.trim().toLowerCase();

        // Enforce rule: Third marker must differ from both original examiners
        if (normalizedThirdEmail === supervisorEmail || normalizedThirdEmail === assessorEmail) {
            return res.status(400).json({
                error: "Invalid Third Marker Selection",
                message: "The Third Marker must be an independent examiner different from both the Supervisor and the Assessor."
            });
        }

        const reconciliation = await prisma.milestone_reconciliations.upsert({
            where: {
                milestone_id_student_id: {
                    milestone_id: milestoneId,
                    student_id: studentId
                }
            },
            update: {
                status: "AWAITING_THIRD_MARKER",
                third_marker_email: normalizedThirdEmail,
                third_marker_name: third_marker_name ? third_marker_name.trim() : "Nominated Third Examiner",
                third_marker_assigned_by: userEmail,
                third_marker_assigned_at: new Date()
            },
            create: {
                milestone_id: milestoneId,
                student_id: studentId,
                status: "AWAITING_THIRD_MARKER",
                third_marker_email: normalizedThirdEmail,
                third_marker_name: third_marker_name ? third_marker_name.trim() : "Nominated Third Examiner",
                third_marker_assigned_by: userEmail,
                third_marker_assigned_at: new Date()
            }
        });

        res.status(200).json({
            message: `Third Marker (${normalizedThirdEmail}) assigned successfully by Head of School of Computing.`,
            reconciliation
        });
    } catch (error) {
        console.error("Assign Third Marker Error:", error);
        res.status(500).json({ error: "Failed to assign Third Marker.", details: error.message });
    }
};

// ======================================================
// 8. GET HEAD OF COMPUTING THIRD-MARKER QUEUE
// ======================================================
exports.getHeadReferralQueue = async (req, res) => {
    const userRole = (req.headers["x-user-role"] || "").trim().toUpperCase();
    if (!["ADMIN", "HEAD_OF_COMPUTING"].includes(userRole)) {
        return res.status(403).json({ error: "Unauthorized access to Head of Computing referral queue." });
    }

    try {
        const referrals = await prisma.milestone_reconciliations.findMany({
            where: { status: "AWAITING_THIRD_MARKER" },
            include: {
                students: { include: { batches: true, student_fyp_records: { include: { supervisors: true, assessors: true } } } },
                milestones: true,
                proposals: { orderBy: { version: "desc" } }
            },
            orderBy: { updated_at: "desc" }
        });

        res.status(200).json(referrals);
    } catch (error) {
        console.error("Get Head Referral Queue Error:", error);
        res.status(500).json({ error: "Failed to fetch referral queue.", details: error.message });
    }
};
