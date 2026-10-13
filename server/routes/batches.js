const express = require("express");
const router = express.Router();
const {
    getBatches,
    createBatch,
    updateBatchStage,
    updateBatch,
    deleteBatch,
    addStudentToBatch,
    removeStudentFromBatch
} = require("../controllers/batchController");

// Authorization check: Ensure requester has PM or ADMIN role if role header is supplied
const checkPMRole = (req, res, next) => {
    const rawRole = req.headers["x-user-role"];
    if (rawRole) {
        const userRole = String(rawRole).trim().toUpperCase();
        if (userRole !== "PM" && userRole !== "ADMIN") {
            return res.status(403).json({
                error: "Forbidden",
                message: "Only PM and Admin users are authorized to manage batch students."
            });
        }
    }
    next();
};

router.get("/", getBatches);
router.post("/", createBatch);
router.put("/:id/stage", updateBatchStage);
router.put("/:id", updateBatch);
router.delete("/:id", deleteBatch);
router.post("/:id/students", addStudentToBatch);
router.delete("/:id/students/:studentId", checkPMRole, removeStudentFromBatch);

module.exports = router;