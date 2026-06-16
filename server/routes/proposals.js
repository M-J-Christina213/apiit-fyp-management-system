import express from "express";
import proposals from "../data/proposals.js";

const router = express.Router();

router.get("/", (req, res) => {
    res.json(proposals);
});

export default router;