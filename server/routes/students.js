const express = require("express");
const { getStudents, getStudentById, createStudent, updateStudent, deleteStudent, allocateSupervisor } = require("../controllers/studentController");

const router = express.Router();

router.get("/", getStudents);
router.get("/:id", getStudentById);
router.post("/", createStudent);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);
router.post("/:id/allocate-supervisor", allocateSupervisor);

module.exports = router;