const express = require("express");
const router = express.Router();
const milestoneController = require("../controllers/milestoneController");

// ======================================================
// PM — Milestone CRUD (batch-scoped)
// ======================================================
// GET  /api/milestones/batch/:batchId
router.get("/batch/:batchId", milestoneController.getMilestonesByBatch);

// POST /api/milestones
router.post("/", milestoneController.createMilestone);

// ======================================================
// Status — Update a student's milestone status (PM / Supervisor)
// IMPORTANT: must be registered BEFORE the generic /:id routes
// ======================================================
// PUT  /api/milestones/status/update
router.put("/status/update", milestoneController.updateStudentStatus);

// ======================================================
// Progress — Student view
// Must be above /:id to avoid collision
// ======================================================
// GET  /api/milestones/progress/student/:studentId
router.get("/progress/student/:studentId", milestoneController.getStudentProgress);

// GET  /api/milestones/progress/cb/:cbNo
router.get("/progress/cb/:cbNo", milestoneController.getStudentProgressByCbNo);

// ======================================================
// Progress — Supervisor view
// ======================================================
// GET  /api/milestones/supervisor/:email
router.get("/supervisor/:email", milestoneController.getSupervisorMilestoneOverview);

// ======================================================
// Progress — Assessor view
// ======================================================
// GET  /api/milestones/assessor/:email
router.get("/assessor/:email", milestoneController.getAssessorMilestoneOverview);

// ======================================================
// Generic /:id routes — MUST be last to avoid swallowing named paths
// ======================================================
// PUT  /api/milestones/:id
router.put("/:id", milestoneController.updateMilestone);

// DELETE /api/milestones/:id
router.delete("/:id", milestoneController.deleteMilestone);

module.exports = router;
