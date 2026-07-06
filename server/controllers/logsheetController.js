const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const NotificationService = require("../services/notificationService");

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

const getSemesterFromStage = (stage) => {
    switch (stage) {
        case "Proposal":
            return "Semester 1";
        case "Midpoint":
            return "Semester 2";
        case "Final":
            return "Semester 3";
        default:
            return "Semester 1";
    }
};

const stampSignatureOnPdf = async (pdfPath, signaturePath, outputPath) => {
    try {
        if (!fs.existsSync(pdfPath) || !fs.existsSync(signaturePath)) {
            console.error("PDF or Signature file does not exist", { pdfPath, signaturePath });
            return false;
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        if (pages.length === 0) return false;

        const lastPage = pages[pages.length - 1];
        const signatureBytes = fs.readFileSync(signaturePath);
        
        let img;
        const sigExt = path.extname(signaturePath).toLowerCase();
        if (sigExt === '.png') {
            img = await pdfDoc.embedPng(signatureBytes);
        } else if (sigExt === '.jpg' || sigExt === '.jpeg') {
            img = await pdfDoc.embedJpg(signatureBytes);
        } else {
            try {
                img = await pdfDoc.embedPng(signatureBytes);
            } catch {
                img = await pdfDoc.embedJpg(signatureBytes);
            }
        }

        const { width, height } = lastPage.getSize();
        const stampWidth = 100;
        const stampHeight = 50;
        
        lastPage.drawImage(img, {
            x: width - stampWidth - 30,
            y: 30,
            width: stampWidth,
            height: stampHeight
        });

        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, modifiedPdfBytes);
        return true;
    } catch (err) {
        console.error("PDF signature stamping failed:", err);
        return false;
    }
};

// Create a logsheet (student submission)
const createLogsheet = async (req, res) => {
    try {
        const { student_id, meeting_date, venue } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "Supporting logsheet file is mandatory." });
        }

        if (!meeting_date) {
            return res.status(400).json({ message: "Meeting date is required." });
        }

        const studentDbId = await resolveStudentDbId(student_id);
        if (!studentDbId) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Find confirmed supervisor from student_fyp_records
        const fypRecord = await prisma.student_fyp_records.findFirst({
            where: {
                student_id: studentDbId,
                supervisor_confirmation_status: { in: ["Approved", "Confirmed", "Allocated"] }
            }
        });

        const supervisorId = fypRecord ? fypRecord.supervisor_id : null;

        // Get student's batch stage to derive semester
        const student = await prisma.students.findUnique({
            where: { id: studentDbId },
            include: { batches: true }
        });

        const stage = student?.batches?.stage || "Proposal";
        const semester = getSemesterFromStage(stage);

        const logsheet = await prisma.logsheets.create({
            data: {
                student_id: studentDbId,
                supervisor_id: supervisorId,
                meeting_date: new Date(meeting_date),
                venue: venue || null,
                file_name: file.originalname,
                file_path: file.filename,
                file_type: file.mimetype,
                file_size: (file.size / 1024).toFixed(2) + " KB",
                status: "Pending Review",
                semester
            },
            include: {
                supervisors: true
            }
        });

        if (supervisorId) {
            await NotificationService.notifySupervisor(
                supervisorId,
                "New Logsheet Submitted",
                `Student ${student?.student_name || "A student"} has uploaded a new logsheet for review.`
            );
        }

        res.status(201).json({
            id: logsheet.id,
            meeting_date: logsheet.meeting_date,
            venue: logsheet.venue,
            status: logsheet.status,
            semester: logsheet.semester,
            supervisor_name: logsheet.supervisors
                ? `${logsheet.supervisors.title || ""} ${logsheet.supervisors.name}`.trim()
                : "N/A",
            file_name: logsheet.file_name,
            file_path: logsheet.file_path
        });

    } catch (err) {
        console.error("Failed to submit logsheet:", err);
        res.status(500).json({ message: "Failed to submit logsheet. Please try again." });
    }
};

// Update existing logsheet (Student PUT endpoint)
const updateLogsheet = async (req, res) => {
    try {
        const { id } = req.params;
        const { meeting_date, venue } = req.body;
        const file = req.file;

        const logsheetId = Number(id);
        const logsheet = await prisma.logsheets.findUnique({
            where: { id: logsheetId }
        });

        if (!logsheet) {
            return res.status(404).json({ message: "Logsheet not found." });
        }

        if (logsheet.status === "Approved") {
            return res.status(400).json({ message: "Approved logsheets are locked and cannot be modified." });
        }

        const updateData = {};
        if (meeting_date) updateData.meeting_date = new Date(meeting_date);
        if (venue !== undefined) updateData.venue = venue;

        if (file) {
            updateData.file_name = file.originalname;
            updateData.file_path = file.filename;
            updateData.file_type = file.mimetype;
            updateData.file_size = (file.size / 1024).toFixed(2) + " KB";
        }

        // If rejected, reset back to Pending Review
        if (logsheet.status === "Rejected") {
            updateData.status = "Pending Review";
            updateData.rejection_reason = null;
        }

        const updated = await prisma.logsheets.update({
            where: { id: logsheetId },
            data: updateData,
            include: {
                supervisors: true
            }
        });

        res.json({
            id: updated.id,
            meeting_date: updated.meeting_date,
            venue: updated.venue,
            status: updated.status,
            semester: updated.semester,
            supervisor_name: updated.supervisors
                ? `${updated.supervisors.title || ""} ${updated.supervisors.name}`.trim()
                : "N/A",
            file_name: updated.file_name,
            file_path: updated.file_path
        });
    } catch (err) {
        console.error("Failed to update logsheet:", err);
        res.status(500).json({ message: "Failed to update logsheet." });
    }
};

// Delete logsheet
const deleteLogsheet = async (req, res) => {
    try {
        const { id } = req.params;
        const logsheetId = Number(id);

        const logsheet = await prisma.logsheets.findUnique({
            where: { id: logsheetId }
        });

        if (!logsheet) {
            return res.status(404).json({ message: "Logsheet not found." });
        }

        if (logsheet.status === "Approved") {
            return res.status(400).json({ message: "Approved logsheets are locked and cannot be deleted." });
        }

        await prisma.logsheets.delete({
            where: { id: logsheetId }
        });

        res.json({ message: "Logsheet deleted successfully." });
    } catch (err) {
        console.error("Failed to delete logsheet:", err);
        res.status(500).json({ message: "Failed to delete logsheet." });
    }
};

// Get logsheets for a student
const getStudentLogsheets = async (req, res) => {
    try {
        const { id } = req.params;
        const studentDbId = await resolveStudentDbId(id);

        if (!studentDbId) {
            return res.json([]);
        }

        const logsheetsList = await prisma.logsheets.findMany({
            where: { student_id: studentDbId },
            orderBy: { meeting_date: "desc" },
            include: {
                supervisors: true
            }
        });

        const formatted = logsheetsList.map(l => ({
            id: l.id,
            meeting_date: l.meeting_date,
            venue: l.venue,
            status: l.status,
            semester: l.semester,
            rejection_reason: l.rejection_reason,
            supervisor_name: l.supervisors
                ? `${l.supervisors.title || ""} ${l.supervisors.name}`.trim()
                : "N/A",
            file_name: l.file_name,
            file_path: l.file_path
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Failed to fetch logsheets:", err);
        res.status(500).json({ message: "Failed to fetch logsheets." });
    }
};

// Get logsheets for supervisor (workflow view)
const getSupervisorLogsheets = async (req, res) => {
    try {
        let supervisorId = req.query.supervisorId;
        const email = req.query.email;

        if (!supervisorId && email) {
            const supervisor = await prisma.supervisors.findUnique({ where: { email } });
            if (supervisor) supervisorId = supervisor.id;
        }

        if (!supervisorId) {
            return res.status(400).json({ message: "Supervisor ID or email is required." });
        }

        const supId = Number(supervisorId);

        const logsheetsList = await prisma.logsheets.findMany({
            where: {
                OR: [
                    { supervisor_id: supId },
                    {
                        students: {
                            student_fyp_records: {
                                some: {
                                    supervisor_id: supId
                                }
                            }
                        }
                    }
                ]
            },
            orderBy: { meeting_date: "desc" },
            include: {
                students: true,
                supervisors: true
            }
        });

        const formatted = logsheetsList.map(l => ({
            id: l.id,
            student_id: l.student_id,
            student_name: l.students?.student_name || "N/A",
            student_cb_no: l.students?.cb_no || "N/A",
            meeting_date: l.meeting_date,
            venue: l.venue,
            status: l.status,
            semester: l.semester,
            rejection_reason: l.rejection_reason,
            approved_at: l.approved_at,
            rejected_at: l.rejected_at,
            signature_applied: l.signature_applied,
            signed_file_url: l.signed_file_url,
            file_name: l.file_name,
            file_path: l.file_path,
            supervisor_name: l.supervisors ? `${l.supervisors.title || ""} ${l.supervisors.name}`.trim() : "N/A"
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Failed to fetch supervisor logsheets:", err);
        res.status(500).json({ message: "Failed to fetch supervisor logsheets." });
    }
};

// Get students assigned to supervisor
const getSupervisorStudents = async (req, res) => {
    try {
        let supervisorId = req.query.supervisorId;
        const email = req.query.email;

        if (!supervisorId && email) {
            const supervisor = await prisma.supervisors.findUnique({ where: { email } });
            if (supervisor) supervisorId = supervisor.id;
        }

        if (!supervisorId) {
            return res.status(400).json({ message: "Supervisor ID or email is required." });
        }

        const supId = Number(supervisorId);

        const dbStudents = await prisma.students.findMany({
            where: {
                student_fyp_records: {
                    some: {
                        supervisor_id: supId
                    }
                }
            },
            include: {
                batches: true,
                student_fyp_records: true
            }
        });

        const formatted = dbStudents.map(s => ({
            id: s.id,
            cb_no: s.cb_no,
            student_name: s.student_name,
            batch_name: s.batches?.batch_intake || "N/A",
            batch_stage: s.batches?.stage || "Proposal"
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Failed to fetch supervisor students:", err);
        res.status(500).json({ message: "Failed to fetch supervisor students." });
    }
};

// Upload supervisor signature url
const uploadSignature = async (req, res) => {
    try {
        const { supervisorId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "Signature image is required." });
        }

        if (!supervisorId) {
            return res.status(400).json({ message: "Supervisor ID is required." });
        }

        const updated = await prisma.supervisors.update({
            where: { id: Number(supervisorId) },
            data: {
                signature_url: file.filename
            }
        });

        res.json({ signature_url: file.filename });
    } catch (err) {
        console.error("Failed to upload signature:", err);
        res.status(500).json({ message: "Failed to upload signature." });
    }
};

// Approve logsheet (with pdf stamping)
const approveLogsheet = async (req, res) => {
    try {
        const { id } = req.params;
        const { supervisorId } = req.body;

        const logsheetId = Number(id);
        const logsheet = await prisma.logsheets.findUnique({
            where: { id: logsheetId },
            include: { students: true }
        });

        if (!logsheet) {
            return res.status(404).json({ message: "Logsheet not found." });
        }

        const resolvedSupId = Number(supervisorId || logsheet.supervisor_id);
        if (!resolvedSupId) {
            return res.status(400).json({ message: "Supervisor not resolved." });
        }

        const supervisor = await prisma.supervisors.findUnique({
            where: { id: resolvedSupId }
        });

        if (!supervisor) {
            return res.status(404).json({ message: "Supervisor not found." });
        }

        if (!supervisor.signature_url) {
            return res.status(400).json({ message: "Please upload your digital signature before approving logsheets." });
        }

        const originalPath = path.join("uploads", "logsheets", logsheet.file_path);
        const signaturePath = path.join("uploads", "signatures", supervisor.signature_url);
        const signedFilename = `signed-${Date.now()}-${logsheet.file_path}`;
        const outputPath = path.join("uploads", "logsheets", signedFilename);

        let signatureApplied = false;

        // Stamp signature if PDF
        if (logsheet.file_name.toLowerCase().endsWith(".pdf")) {
            signatureApplied = await stampSignatureOnPdf(originalPath, signaturePath, outputPath);
        }

        const updated = await prisma.logsheets.update({
            where: { id: logsheetId },
            data: {
                status: "Approved",
                approved_at: new Date(),
                signature_applied: signatureApplied,
                signed_file_url: signatureApplied ? signedFilename : null,
                file_path: signatureApplied ? signedFilename : logsheet.file_path // Point to signed file if stamped
            }
        });

        // Trigger student notification
        if (logsheet.students) {
            await NotificationService.notifyStudent(
                logsheet.students.id,
                "Logsheet Approved",
                "Your logsheet has been approved by your supervisor."
            );
        }

        res.json({ message: "Logsheet approved successfully.", logsheet: updated });

    } catch (err) {
        console.error("Failed to approve logsheet:", err);
        res.status(500).json({ message: "Failed to approve logsheet." });
    }
};

// Reject logsheet with reason
const rejectLogsheet = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({ message: "Rejection reason is required." });
        }

        const logsheetId = Number(id);
        const logsheet = await prisma.logsheets.findUnique({
            where: { id: logsheetId },
            include: { students: true }
        });

        if (!logsheet) {
            return res.status(404).json({ message: "Logsheet not found." });
        }

        const updated = await prisma.logsheets.update({
            where: { id: logsheetId },
            data: {
                status: "Rejected",
                rejected_at: new Date(),
                rejection_reason
            }
        });

        // Trigger student notification
        if (logsheet.students) {
            await NotificationService.notifyStudent(
                logsheet.students.id,
                "Logsheet Rejected",
                `Your logsheet was rejected. Reason: ${rejection_reason}`
            );
        }

        res.json({ message: "Logsheet rejected successfully.", logsheet: updated });

    } catch (err) {
        console.error("Failed to reject logsheet:", err);
        res.status(500).json({ message: "Failed to reject logsheet." });
    }
};

module.exports = {
    createLogsheet,
    updateLogsheet,
    deleteLogsheet,
    getStudentLogsheets,
    getSupervisorLogsheets,
    getSupervisorStudents,
    uploadSignature,
    approveLogsheet,
    rejectLogsheet
};
