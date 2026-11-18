const express = require("express");
const router = express.Router();
const milestoneController = require("../controllers/milestoneController");

// ======================================================
// Batch Milestone Configuration (PM & Admin)
// ======================================================

// GET   /api/milestones/batch/:batchId
router.get("/batch/:batchId", milestoneController.getMilestonesByBatch);

// POST  /api/milestones/batch/:batchId/apply-template
router.post("/batch/:batchId/apply-template", milestoneController.applyApprovedTemplate);

// PATCH /api/milestones/batch/:batchId/publish
router.patch("/batch/:batchId/publish", milestoneController.publishBatchMilestones);

// POST  /api/milestones
router.post("/", milestoneController.createMilestone);

// ======================================================
// Student Timeline & Progress
// ======================================================

// GET  /api/milestones/progress/student/:studentId
router.get("/progress/student/:studentId", milestoneController.getStudentProgress);

// GET  /api/milestones/progress/cb/:cbNo
router.get("/progress/cb/:cbNo", milestoneController.getStudentProgressByCbNo);

// ======================================================
// Staff Progress Views
// ======================================================

// GET  /api/milestones/supervisor/:email
router.get("/supervisor/:email", milestoneController.getSupervisorMilestoneOverview);

// GET  /api/milestones/assessor/:email
router.get("/assessor/:email", milestoneController.getAssessorMilestoneOverview);

// ======================================================
// Individual Milestone Management
// ======================================================

// PUT    /api/milestones/:id
router.put("/:id", milestoneController.updateMilestone);

// DELETE /api/milestones/:id
router.delete("/:id", milestoneController.deleteMilestone);

module.exports = router;
