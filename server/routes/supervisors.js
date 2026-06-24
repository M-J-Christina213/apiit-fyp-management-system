const express = require("express");
const { getSupervisors, createSupervisor, uploadSupervisors, clearAllSupervisors, updateSupervisor, deleteSupervisor } = require("../controllers/supervisorController");

const router = express.Router();

router.get("/", getSupervisors);
router.post("/", createSupervisor);
router.post("/upload", uploadSupervisors);
router.delete("/", clearAllSupervisors);
router.put("/:id", updateSupervisor);
router.delete("/:id", deleteSupervisor);

module.exports = router;