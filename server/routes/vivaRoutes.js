const express = require("express");
const router = express.Router();
const vivaController = require("../controllers/vivaController");

// ======================================================
// ADMIN - VIVA PERIOD MANAGEMENT
// ======================================================

// Create a new Viva Period
router.post("/periods", vivaController.createVivaPeriod);

// Get all Viva Periods
router.get("/periods", vivaController.getVivaPeriods);

// Get single Viva Period
router.get("/periods/:id", vivaController.getVivaPeriodById);

// Update Viva Period
router.put("/periods/:id", vivaController.updateVivaPeriod);

// Delete Viva Period
router.delete("/periods/:id", vivaController.deleteVivaPeriod);


// ======================================================
// ADMIN - DASHBOARD
// ======================================================

// Dashboard statistics
router.get("/dashboard", vivaController.getDashboardStats);

// Availability status for a specific Viva Period
router.get(
    "/periods/:periodId/availability-status",
    vivaController.getAvailabilityStatus
);


// ======================================================
// AVAILABILITY
// ======================================================

// Submit availability
router.post(
    "/periods/:periodId/availability",
    vivaController.submitAvailability
);

// Get availability
router.get(
    "/periods/:periodId/availability",
    vivaController.getAvailability
);


// ======================================================
// AUTOMATIC SCHEDULING
// ======================================================

// Trigger automatic scheduling
router.post(
    "/periods/:periodId/generate",
    vivaController.triggerAutoScheduling
);


// ======================================================
// SCHEDULES
// ======================================================

// Get schedules
router.get(
    "/periods/:periodId/schedules",
    vivaController.getSchedules
);

// Confirm a schedule
router.put(
    "/schedules/:scheduleId/confirm",
    vivaController.confirmSchedule
);

// Get Integration Status
router.get("/integration-status", vivaController.getIntegrationStatus);

module.exports = router;