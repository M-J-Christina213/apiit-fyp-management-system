const express = require("express");
const router = express.Router();
const evaluationController = require("../controllers/evaluationController");

// ======================================================
// Marking Workspace & Evaluations
// ======================================================

// GET   /api/evaluations/workspace/:studentId/:milestoneId
router.get("/workspace/:studentId/:milestoneId", evaluationController.getMarkingWorkspace);

// POST  /api/evaluations/draft (Autosave & Concurrent Safe)
router.post("/draft", evaluationController.saveDraft);

// POST  /api/evaluations/submit (Final Submission)
router.post("/submit", evaluationController.submitEvaluation);

// ======================================================
// Mark Reconciliation & Agreement
// ======================================================

// POST  /api/evaluations/reconciliation/propose
router.post("/reconciliation/propose", evaluationController.proposeAgreedMark);

// POST  /api/evaluations/reconciliation/confirm
router.post("/reconciliation/confirm", evaluationController.confirmAgreedMark);

// POST  /api/evaluations/reconciliation/check-expiry
router.post("/reconciliation/check-expiry", evaluationController.checkReconciliationExpiry);

// ======================================================
// Head of School of Computing Third Marker Assignment
// ======================================================

// GET   /api/evaluations/reconciliation/head-queue
router.get("/reconciliation/head-queue", evaluationController.getHeadReferralQueue);

// POST  /api/evaluations/reconciliation/assign-third-marker
router.post("/reconciliation/assign-third-marker", evaluationController.assignThirdMarker);

module.exports = router;
