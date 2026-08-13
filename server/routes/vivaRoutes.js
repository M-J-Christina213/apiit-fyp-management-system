const express = require("express");
const router = express.Router();
const vivaController = require("../controllers/vivaController");
const { verifyRole } = require("../middleware/roleMiddleware");

// Create a new Viva Period
router.post("/periods", verifyRole("admin"), vivaController.createVivaPeriod);

// Get all Viva Periods
router.get("/periods", verifyRole(["admin", "pm"]), vivaController.getVivaPeriods);

// Get single Viva Period
router.get("/periods/:id", verifyRole(["admin", "pm"]), vivaController.getVivaPeriodById);

// Update Viva Period
router.put("/periods/:id", verifyRole("admin"), vivaController.updateVivaPeriod);

// Delete Viva Period
router.delete("/periods/:id", verifyRole("admin"), vivaController.deleteVivaPeriod);

// Publish Viva Period
router.put("/periods/:id/publish", verifyRole("admin"), vivaController.publishVivaPeriod);

// Dashboard statistics
router.get("/dashboard", verifyRole(["admin", "pm"]), vivaController.getDashboardStats);

// Availability status for a specific Viva Period
router.get("/periods/:periodId/availability-status", verifyRole("admin"), vivaController.getAvailabilityStatus);

// Submit availability
router.post("/periods/:periodId/availability", vivaController.submitAvailability);

// Get availability
router.get("/periods/:periodId/availability", verifyRole(["admin", "pm"]), vivaController.getAvailability);

// Trigger automatic scheduling
router.post("/periods/:periodId/generate", verifyRole("admin"), vivaController.triggerAutoScheduling);

// Get schedules
router.get("/periods/:periodId/schedules", verifyRole(["admin", "pm"]), vivaController.getSchedules);

// Finalize a schedule
router.put("/schedules/:scheduleId/finalize", verifyRole("admin"), vivaController.finalizeSchedule);

// Update a schedule (manual edit)
router.put("/schedules/:scheduleId", verifyRole("admin"), vivaController.updateSchedule);

// Export schedules for a period
router.get("/periods/:id/export", verifyRole(["admin", "pm"]), vivaController.exportSchedules);

// Get My Dashboard Data (Student, Supervisor, Assessor)
router.get("/my-dashboard/:role/:id", vivaController.getMyDashboard);

module.exports = router;