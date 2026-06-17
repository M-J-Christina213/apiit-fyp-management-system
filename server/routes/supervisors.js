const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dataPath = path.join(__dirname, "../data/supervisors.json");

const readSupervisors = () => {
    try {
        const data = fs.readFileSync(dataPath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeSupervisors = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
};

router.get("/", (req, res) => {
    res.json(readSupervisors());
});

router.post("/upload", (req, res) => {
    const importedSupervisors = req.body;
    writeSupervisors(importedSupervisors);
    res.json({ message: "Supervisors replaced successfully", count: importedSupervisors.length });
});

module.exports = router;