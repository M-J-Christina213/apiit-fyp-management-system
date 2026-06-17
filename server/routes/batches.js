const express = require("express");
const batches = require("../data/batches");

const router = express.Router();

router.get("/", (req, res) => {
    res.json(batches);
});

module.exports = router;