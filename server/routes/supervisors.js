import express from "express";
import supervisors from "../data/supervisors.js";

const router = express.Router();

router.get("/", (req, res) => {
    res.json(supervisors);
});

export default router;