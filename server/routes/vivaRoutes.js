const express = require("express");
const router = express.Router();
const vivaController = require("../controllers/vivaController");

// Admin: Periods
router.get("/periods", vivaController.getVivaPeriods);
router.post("/periods", vivaController.createVivaPeriod);
router.post("/periods/:periodId/schedule", vivaController.triggerAutoScheduling);

// All: Availability
router.post("/availability", vivaController.submitAvailability);

// All: Schedules
router.get("/schedules", vivaController.getSchedules);
router.put("/schedules/:id", vivaController.updateSchedule);

module.exports = router;
