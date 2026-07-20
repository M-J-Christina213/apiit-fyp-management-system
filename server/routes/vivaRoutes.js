const express = require("express");
const router = express.Router();
const vivaController = require("../controllers/vivaController");

// Admin: Periods & Dashboard
router.post("/create", vivaController.createVivaPeriod);
router.get("/stages", vivaController.getVivaStages);
router.get("/dashboard", vivaController.getDashboardStats);
router.post("/generate", vivaController.triggerAutoScheduling);

// Availability
router.post("/supervisor/availability", vivaController.submitAvailability);
router.get("/supervisor/availability", vivaController.getAvailability);

router.post("/assessor/availability", vivaController.submitAvailability);
router.get("/assessor/availability", vivaController.getAvailability);

router.post("/student/availability", vivaController.submitAvailability);
router.get("/student/availability", vivaController.getAvailability);

// Schedules
router.get("/schedules", vivaController.getSchedules);

module.exports = router;
