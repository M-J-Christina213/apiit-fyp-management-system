const express = require("express");
const router = express.Router();
const { getBatches, createBatch, updateBatchStage } = require("../controllers/batchController");

router.get("/", getBatches);
router.post("/", createBatch);
router.put("/:id/stage", updateBatchStage);

module.exports = router;