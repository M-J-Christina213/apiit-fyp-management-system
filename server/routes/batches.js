const express = require("express");
const router = express.Router();
const { getBatches, createBatch, updateBatchStage, updateBatch, deleteBatch } = require("../controllers/batchController");

router.get("/", getBatches);
router.post("/", createBatch);
router.put("/:id/stage", updateBatchStage);
router.put("/:id", updateBatch);
router.delete("/:id", deleteBatch);

module.exports = router;