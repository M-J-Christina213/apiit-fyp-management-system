const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    getReviewWorkspace,
    uploadManualReviewCopy,
    getSubmissionFile,
    saveReviewerNotes,
    releaseFeedback,
    syncWithLms,
    getLmsMappings,
    saveLmsMapping,
    getStudentReleasedFeedback
} = require("../controllers/submissionReviewController");

const router = express.Router();

// ── Manual review copy file storage (PDF/DOC) ──────────────────────────────
const submissionDir = "uploads/submissions";
if (!fs.existsSync(submissionDir)) fs.mkdirSync(submissionDir, { recursive: true });

const submissionStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, submissionDir),
    filename: (req, file, cb) => {
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        cb(null, `${Date.now()}-${safeOriginalName}`);
    }
});

const submissionUpload = multer({
    storage: submissionStorage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (/\.(pdf|doc|docx)$/.test(ext)) return cb(null, true);
        cb(new Error("Only PDF and Word documents (.doc, .docx) are allowed."));
    },
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// ── Submission Review Workspace Routes ──────────────────────────────────────
router.get("/review-workspace/:studentId", getReviewWorkspace);
router.post("/upload-manual-copy", submissionUpload.single("file"), uploadManualReviewCopy);
router.get("/:submissionId/file", getSubmissionFile);
router.post("/notes/save", saveReviewerNotes);
router.post("/feedback/release", releaseFeedback);
router.post("/lms/sync", syncWithLms);
router.get("/student/feedback/:studentId", getStudentReleasedFeedback);

// ── LMS Mappings (Admin / PM) ───────────────────────────────────────────────
router.get("/lms/mappings", getLmsMappings);
router.post("/lms/mappings", saveLmsMapping);

module.exports = router;
