const express = require("express");
const supervisors = require("../data/supervisors.js");

const router = express.Router();

router.get("/", (req, res) => {
    res.json(supervisors);
});

module.exports = router;