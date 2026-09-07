const express = require("express");
const router = express.Router();
const multer = require("multer");
const vivaController = require("../controllers/vivaController");
const { verifyRole } = require("../middleware/roleMiddleware");

// Memory storage for Excel upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==========================================
// 1. ADMIN - VIVA PERIODS & BATCHES
// ==========================================
router.get("/batches-with-students", verifyRole("admin"), vivaController.getBatchesWithStudents);
router.post("/periods", verifyRole("admin"), vivaController.createVivaPeriod);
router.get("/periods", verifyRole(["admin", "pm"]), vivaController.getVivaPeriods);
router.get("/periods/:id", verifyRole(["admin", "pm"]), vivaController.getVivaPeriodById);
router.put("/periods/:id", verifyRole("admin"), vivaController.updateVivaPeriod);
router.put("/periods/:id/status", verifyRole("admin"), vivaController.updateVivaPeriodStatus);
router.delete("/periods/:id", verifyRole("admin"), vivaController.deleteVivaPeriod);
router.get("/dashboard", verifyRole(["admin", "pm"]), vivaController.getDashboardStats);

// ==========================================
// 2. ADMIN - EXCEL IMPORT & MANUAL SCHEDULE CREATION
// ==========================================
router.post(
    "/periods/:periodId/validate-excel",
    verifyRole("admin"),
    upload.single("file"),
    vivaController.validateExcelSchedule
);
router.post("/periods/:periodId/import-excel", verifyRole("admin"), vivaController.importExcelSchedule);
router.post("/periods/:periodId/manual-schedule", verifyRole("admin"), vivaController.createManualSchedule);

// ==========================================
// 3. ADMIN & PM - SCHEDULE MANAGEMENT
// ==========================================
router.get("/periods/:periodId/schedules", verifyRole(["admin", "pm"]), vivaController.getSchedules);
router.put("/schedules/:scheduleId", verifyRole("admin"), vivaController.updateSchedule);
router.delete("/schedules/:scheduleId", verifyRole("admin"), vivaController.deleteSchedule);
router.put("/schedules/:scheduleId/report-link", verifyRole("admin"), vivaController.updateReportLink);
router.get("/periods/:id/export", verifyRole(["admin", "pm"]), vivaController.exportSchedules);

// ==========================================
// 4. ADMIN - CHANGE REQUEST CENTER
// ==========================================
router.get("/change-requests", verifyRole("admin"), vivaController.getChangeRequests);
router.put("/change-requests/:requestId/resolve", verifyRole("admin"), vivaController.resolveChangeRequest);

// ==========================================
// 5. ADMIN - FINALIZATION WORKFLOW & OUTLOOK SYNC
// ==========================================
router.get("/periods/:periodId/finalization-checklist", verifyRole("admin"), vivaController.getFinalizationChecklist);
router.post("/periods/:periodId/finalize", verifyRole("admin"), vivaController.finalizeVivaPeriod);
router.post("/schedules/:scheduleId/retry-sync", verifyRole("admin"), vivaController.retryOutlookSync);
router.post("/periods/:periodId/retry-sync", verifyRole("admin"), vivaController.retryOutlookSync);

// ==========================================
// 6. ADMIN - MICROSOFT 365 INTEGRATION
// ==========================================
router.get("/microsoft/auth-url", verifyRole("admin"), vivaController.getMicrosoftAuthUrl);
router.get("/microsoft/callback", vivaController.handleMicrosoftCallback);
router.get("/microsoft/status", verifyRole("admin"), vivaController.getMicrosoftStatus);
router.post("/microsoft/disconnect", verifyRole("admin"), vivaController.disconnectMicrosoft);

// ==========================================
// 7. ADMIN - AUDIT TRAIL
// ==========================================
router.get("/periods/:periodId/audit-logs", verifyRole("admin"), vivaController.getPeriodAuditLogs);

// ==========================================
// 8. SUPERVISOR & ASSESSOR - ASSIGNED SCHEDULES & CONFIRMATIONS
// ==========================================
router.get("/my-assigned-schedules", vivaController.getMyAssignedSchedules);
router.post("/schedules/:scheduleId/review-availability", vivaController.submitReviewAvailability);
router.get("/schedules/:scheduleId/notes", vivaController.getVivaNotes);
router.post("/schedules/:scheduleId/notes", vivaController.saveVivaNote);

// ==========================================
// 9. STUDENT - MY VIVA VIEW
// ==========================================
router.get("/my-student-viva", vivaController.getMyStudentViva);

// ==========================================
// 10. PM - OVERVIEW (READ-ONLY)
// ==========================================
router.get("/pm-overview", verifyRole(["admin", "pm"]), vivaController.getPMVivaOverview);
router.get("/pm-overview/:periodId", verifyRole(["admin", "pm"]), vivaController.getPMVivaOverview);

// Backward-compatible routes
router.put("/periods/:id/publish", verifyRole("admin"), vivaController.publishVivaPeriod);
router.post("/periods/:periodId/generate", verifyRole("admin"), vivaController.triggerAutoScheduling);
router.put("/schedules/:scheduleId/finalize", verifyRole("admin"), vivaController.finalizeSchedule);
router.get("/my-periods", vivaController.getMyPeriods);
router.get("/my-dashboard/:role/:id", vivaController.getMyDashboard);

module.exports = router;