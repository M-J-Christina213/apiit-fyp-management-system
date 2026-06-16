import express from "express";
import students from "../data/students.js";

const router = express.Router();

router.get("/", (req, res) => {
    res.json(students);
});

export default router;