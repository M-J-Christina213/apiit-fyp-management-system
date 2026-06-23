const express = require("express");
const { getAssessors, createAssessor, updateAssessor, deleteAssessor } = require("../controllers/assessorController");

const router = express.Router();

router.get("/", getAssessors);
router.post("/", createAssessor);
router.put("/:id", updateAssessor);
router.delete("/:id", deleteAssessor);

module.exports = router;
