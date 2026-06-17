const express = require("express");
const students = require("../data/students.js");

const router = express.Router();

router.get("/", (req, res) => {
    res.json(students);
});

router.get("/:id", (req, res) => {
    const student = students.find((s) => s.id === req.params.id);
    if (student) {
        res.json(student);
    } else {
        res.status(404).json({ message: "Student not found" });
    }
});

module.exports = router;