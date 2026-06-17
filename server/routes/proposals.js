const express = require("express");
const proposals = require("../data/proposals.js");

const router = express.Router();

router.get("/", (req, res) => {
    res.json(proposals);
});

module.exports = router;