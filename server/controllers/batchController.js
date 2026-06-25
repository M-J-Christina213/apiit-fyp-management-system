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
        
        let fallbackBatchCode = batchCode || intake;

        // If no students provided, just create one empty batch
        if (!students || students.length === 0) {
            const result = await prisma.$transaction(async (tx) => {
                return await tx.batches.upsert({
                    where: { batch_code: fallbackBatchCode },
                    update: {
                        batch_intake: intake,
                        start_fyp_date: new Date(startDate),
                        stage: stage || "Proposal"
                    },
                    create: {
                        batch_code: fallbackBatchCode,
                        batch_intake: intake,
                        start_fyp_date: new Date(startDate),
                        stage: stage || "Proposal"
                    }
                });
            });
            
            return res.status(201).json([{
                id: result.id,
                intake: result.batch_intake,
                startDate: result.start_fyp_date.toISOString().split("T")[0],
                stage: result.stage,
                batchCode: result.batch_code
            }]);
        }

        // Group students by their provided batchCode
        const studentsByBatchCode = {};
        for (const s of students) {
            const code = s.batchCode || fallbackBatchCode;
            if (!studentsByBatchCode[code]) {
                studentsByBatchCode[code] = [];
            }
            studentsByBatchCode[code].push(s);
        }

        const createdBatches = [];

        await prisma.$transaction(async (tx) => {
            for (const [code, batchStudents] of Object.entries(studentsByBatchCode)) {
                // Upsert batch for this specific code
                const newBatch = await tx.batches.upsert({
                    where: { batch_code: code },
                    update: {
                        batch_intake: intake,
                        start_fyp_date: new Date(startDate),
                        stage: stage || "Proposal"
                    },
                    create: {
                        batch_code: code,
                        batch_intake: intake,
                        start_fyp_date: new Date(startDate),
                        stage: stage || "Proposal"
                    }
                });

                // Insert students
                const studentsData = batchStudents.map(s => ({
                    batch_id: newBatch.id,
                    student_name: s.name,
                    cb_no: s.studentNo || s.id
                }));

                await tx.students.createMany({
                    data: studentsData,
                    skipDuplicates: true
                });
                console.log(`[Batch Upload] Inserted students for batch code: ${code}`);

                // Get the students that now exist in the DB (newly created + already existing)
                const cbNos = batchStudents.map(s => s.studentNo || s.id);
                const dbStudents = await tx.students.findMany({
                    where: { cb_no: { in: cbNos } },
                    include: { student_fyp_records: true }
                });

                // Create FYP records for any student that doesn't have one
                const fypRecordsToCreate = [];
                for (const dbStudent of dbStudents) {
                    if (!dbStudent.student_fyp_records || dbStudent.student_fyp_records.length === 0) {
                        fypRecordsToCreate.push({
                            student_id: dbStudent.id,
                            supervisor_confirmation_status: 'Pending'
                        });
                    }
                }

                if (fypRecordsToCreate.length > 0) {
                    await tx.student_fyp_records.createMany({
                        data: fypRecordsToCreate,
                        skipDuplicates: true
                    });
                    console.log(`[Batch Upload] Created ${fypRecordsToCreate.length} FYP records for batch code: ${code}`);
                } else {
                    console.log(`[Batch Upload] No new FYP records needed for batch code: ${code}`);
                }

                createdBatches.push({
                    id: newBatch.id,
                    intake: newBatch.batch_intake,
                    startDate: newBatch.start_fyp_date.toISOString().split("T")[0],
                    stage: newBatch.stage,
                    batchCode: newBatch.batch_code
                });
            }
        });

        res.status(201).json(createdBatches);

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

const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { batchCode, intake, startDate, stage } = req.body;

        const updatedBatch = await prisma.batches.update({
            where: { id: parseInt(id, 10) },
            data: {
                batch_code: batchCode,
                batch_intake: intake,
                start_fyp_date: new Date(startDate),
                stage: stage
            }
        });

        res.json({
            id: updatedBatch.id,
            intake: updatedBatch.batch_intake,
            startDate: updatedBatch.start_fyp_date.toISOString().split("T")[0],
            stage: updatedBatch.stage,
            batchCode: updatedBatch.batch_code
        });
    } catch (error) {
        console.error("Failed to update batch:", error);
        res.status(500).json({ message: "Failed to update batch" });
    }
};

const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Due to onDelete: Cascade on students table (students.batch_id -> batches.id),
        // deleting the batch will automatically delete associated students.
        await prisma.batches.delete({
            where: { id: parseInt(id, 10) }
        });

        res.json({ message: "Batch deleted successfully" });
    } catch (error) {
        console.error("Failed to delete batch:", error);
        res.status(500).json({ message: "Failed to delete batch" });
    }
};

module.exports = {
    getBatches,
    createBatch,
    updateBatchStage,
    updateBatch,
    deleteBatch
};
