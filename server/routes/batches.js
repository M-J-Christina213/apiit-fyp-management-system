const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/batches.json");

// Helper to read data
const readBatches = () => {
    try {
        const data = fs.readFileSync(dataPath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Helper to write data
const writeBatches = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
};

// GET all batches
router.get("/", (req, res) => {
    const batches = readBatches();
    res.json(batches);
});

// CREATE batch
router.post("/", (req, res) => {
    const batches = readBatches();
    const newBatch = req.body;

    batches.push(newBatch);
    writeBatches(batches);

    res.status(201).json(newBatch);
});

// UPDATE stage
router.put("/:id/stage", (req, res) => {
    const batches = readBatches();
    const { id } = req.params;
    const { stage } = req.body;

    const batchIndex = batches.findIndex(b => b.id === id);
    if (batchIndex !== -1) {
        batches[batchIndex].stage = stage;
        writeBatches(batches);
        res.json(batches[batchIndex]);
    } else {
        res.status(404).json({ message: "Batch not found" });
    }
});

module.exports = router;