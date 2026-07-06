const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    createLogsheet,
    updateLogsheet,
    deleteLogsheet,
    getStudentLogsheets,
    getSupervisorLogsheets,
    getSupervisorStudents,
    uploadSignature,
    approveLogsheet,
    rejectLogsheet
} = require("../controllers/logsheetController");

const router = express.Router();

// ── Logsheet file storage (PDF/DOC) ─────────────────────────────────────────
const logsheetDir = "uploads/logsheets";
if (!fs.existsSync(logsheetDir)) fs.mkdirSync(logsheetDir, { recursive: true });

const logsheetStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, logsheetDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const logsheetUpload = multer({
    storage: logsheetStorage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (/\.(pdf|doc|docx)$/.test(ext)) return cb(null, true);
        cb(new Error("Only PDF and Word documents (.doc, .docx) are allowed."));
    }
});

// ── Signature image storage ──────────────────────────────────────────────────
const signatureDir = "uploads/signatures";
if (!fs.existsSync(signatureDir)) fs.mkdirSync(signatureDir, { recursive: true });

const signatureStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, signatureDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-sig" + path.extname(file.originalname))
});

const signatureUpload = multer({
    storage: signatureStorage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (/\.(png|jpg|jpeg)$/.test(ext)) return cb(null, true);
        cb(new Error("Only PNG and JPG signature images are allowed."));
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB limit
});

// ── Student routes ───────────────────────────────────────────────────────────
router.post("/", logsheetUpload.single("file"), createLogsheet);
router.get("/student/:id", getStudentLogsheets);
router.put("/:id", logsheetUpload.single("file"), updateLogsheet);
router.delete("/:id", deleteLogsheet);

// ── Supervisor routes ────────────────────────────────────────────────────────
router.get("/supervisor/logsheets", getSupervisorLogsheets);
router.get("/supervisor/students", getSupervisorStudents);
router.post("/supervisor/approve/:id", approveLogsheet);
router.post("/supervisor/reject/:id", rejectLogsheet);
router.post("/supervisor/signature", signatureUpload.single("signature"), uploadSignature);

module.exports = router;
