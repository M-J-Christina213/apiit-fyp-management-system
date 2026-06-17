const express = require("express");
const proposals = require("../data/proposals");

const router = express.Router();

router.get("/", (req, res) => {
    res.json(proposals);
});

router.post("/", (req, res) => {
    const proposal = {
        id: `PR${String(proposals.length + 1).padStart(3, "0")}`,
        ...req.body
    };

    proposals.push(proposal);

    res.status(201).json(proposal);
});

module.exports = router;