const express = require("express");
const { getSupervisors, createSupervisor, uploadSupervisors, updateSupervisor, deleteSupervisor } = require("../controllers/supervisorController");

const router = express.Router();

router.get("/", getSupervisors);
router.post("/", createSupervisor);
router.post("/upload", uploadSupervisors);
router.put("/:id", updateSupervisor);
router.delete("/:id", deleteSupervisor);

module.exports = router;