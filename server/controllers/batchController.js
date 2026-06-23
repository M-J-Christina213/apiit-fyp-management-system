const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getBatches = async (req, res) => {
    try {
        const batches = await prisma.batches.findMany();
        
        // Map database fields to frontend format
        const mappedBatches = batches.map(batch => ({
            id: batch.id, // We'll return the DB ID. The frontend might have expected a string but it should be fine. Wait, let's map batch.batch_code as an extra property just in case, or just return id.
            intake: batch.batch_intake,
            startDate: batch.start_fyp_date.toISOString().split("T")[0], // YYYY-MM-DD
            stage: batch.stage,
            batchCode: batch.batch_code
        }));

        res.json(mappedBatches);
    } catch (error) {
        console.error("Failed to fetch batches:", error);
        res.status(500).json({ message: "Failed to fetch batches" });
    }
};

const createBatch = async (req, res) => {
    try {
        const { batchCode, intake, startDate, stage, students } = req.body;

        // Start a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the batch
            const newBatch = await tx.batches.create({
                data: {
                    batch_code: batchCode, // Using the actual batch code
                    batch_intake: intake,
                    start_fyp_date: new Date(startDate),
                    stage: stage || "Proposal"
                }
            });

            // 2. Insert students if any
            if (students && students.length > 0) {
                // Prepare student data for insert
                const studentsData = students.map(s => ({
                    batch_id: newBatch.id,
                    student_name: s.name,
                    cb_no: s.studentNo || s.id // PMDashboard sends studentNo from Excel or id from string map
                }));

                await tx.students.createMany({
                    data: studentsData,
                    skipDuplicates: true // In case some cb_nos already exist
                });
            }

            return newBatch;
        });

        // Format for frontend
        const responseBatch = {
            id: result.id, // Using DB ID
            intake: result.batch_intake,
            startDate: result.start_fyp_date.toISOString().split("T")[0],
            stage: result.stage,
            batchCode: result.batch_code
        };

        res.status(201).json(responseBatch);

    } catch (error) {
        console.error("Failed to create batch:", error);
        res.status(500).json({ message: "Failed to create batch" });
    }
};

const updateBatchStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;

        const updatedBatch = await prisma.batches.update({
            where: { id: parseInt(id, 10) },
            data: { stage }
        });

        const responseBatch = {
            id: updatedBatch.id,
            intake: updatedBatch.batch_intake,
            startDate: updatedBatch.start_fyp_date.toISOString().split("T")[0],
            stage: updatedBatch.stage,
            batchCode: updatedBatch.batch_code
        };

        res.json(responseBatch);
    } catch (error) {
        console.error("Failed to update batch stage:", error);
        res.status(500).json({ message: "Failed to update batch stage" });
    }
};

module.exports = {
    getBatches,
    createBatch,
    updateBatchStage
};
