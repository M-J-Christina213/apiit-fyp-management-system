const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    createLogsheet,
    getStudentLogsheets
} = require("../controllers/logsheetController");

const router = express.Router();

const uploadDir = "uploads/logsheets";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error("Only PDF and Word documents (.doc, .docx) are allowed."));
        }
    }
});

router.post("/", upload.single("file"), createLogsheet);
router.get("/student/:id", getStudentLogsheets);

module.exports = router;
