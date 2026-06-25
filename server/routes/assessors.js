const express = require("express");
const { getAssessors, createAssessor, uploadAssessors, updateAssessor, deleteAssessor } = require("../controllers/assessorController");

const router = express.Router();

router.get("/", getAssessors);
router.post("/", createAssessor);
router.post("/upload", uploadAssessors);
router.put("/:id", updateAssessor);
router.delete("/:id", deleteAssessor);

router.post("/upload", async (req, res) => {
    try {
        const assessors = req.body;

        const created = await prisma.assessors.createMany({
            data: assessors,
            skipDuplicates: true,
        });

        res.json({
            message: "Assessors uploaded successfully",
            count: created.count,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Upload failed" });
    }
});

router.get("/", async (req, res) => {
    const assessors = await prisma.assessors.findMany({
        orderBy: { id: "desc" }
    });

    res.json(assessors);
});

router.post("/assign", async (req, res) => {
    const { studentId, assessorId } = req.body;

    try {
        const assessor = await prisma.assessors.findUnique({
            where: { id: assessorId }
        });

        if (assessor.assigned_count >= assessor.preferred_slots) {
            return res.status(400).json({ error: "Assessor fully booked" });
        }

        await prisma.$transaction([
            prisma.student_fyp_records.updateMany({
                where: { student_id: studentId },
                data: { assessor_id: assessorId }
            }),

            prisma.assessors.update({
                where: { id: assessorId },
                data: { assigned_count: { increment: 1 } }
            })
        ]);

        res.json({ message: "Assessor assigned successfully" });

    } catch (err) {
        res.status(500).json({ error: "Assignment failed" });
    }
});

module.exports = router;
