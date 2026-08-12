const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const NotificationService = require("../services/notificationService");

// Helper: safely format a Date (or null) to "YYYY-MM-DD" for the frontend
const formatDate = (date) => {
    if (!date) return null;
    try {
        return date.toISOString().split("T")[0];
    } catch {
        return null;
    }
};

// Helper: safely parse an incoming date string. Returns a valid Date or null.
const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

// batch_code is VarChar(20) in the DB — must never exceed this or Postgres
// will reject the insert/update outright.
const BATCH_CODE_MAX_LEN = 20;

// Helper: generate a batch_code that is guaranteed not to collide with an
// existing row, so createBatch never accidentally upserts into an old batch.
// Strategy: slugify the intake name, truncate to fit, then append a short
// unique suffix (also within the length limit).
const generateUniqueBatchCode = async (tx, baseName) => {
    const rawSlug = (baseName || "BATCH")
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "BATCH";

    // Reserve room for a "-XXXXX" suffix (6 chars) in case we need it
    const slugBase = rawSlug.slice(0, BATCH_CODE_MAX_LEN - 6) || "BATCH";
    const fullSlug = rawSlug.slice(0, BATCH_CODE_MAX_LEN);

    // Try the plain (truncated) slug first (nice and readable if it's free)
    const existing = await tx.batches.findUnique({ where: { batch_code: fullSlug } });
    if (!existing) return fullSlug;

    // Otherwise append a short suffix until we find a free one, staying within the limit
    let attempt = 0;
    while (attempt < 5) {
        const suffix = Date.now().toString(36).toUpperCase().slice(-5);
        const candidate = `${slugBase}-${suffix}`.slice(0, BATCH_CODE_MAX_LEN);
        const clash = await tx.batches.findUnique({ where: { batch_code: candidate } });
        if (!clash) return candidate;
        attempt++;
    }

    // Last resort: fully random suffix, virtually guaranteed unique
    const randomSuffix = Math.random().toString(36).toUpperCase().slice(2, 8);
    return `${slugBase}-${randomSuffix}`.slice(0, BATCH_CODE_MAX_LEN);
};

const getBatches = async (req, res) => {
    try {
        const batches = await prisma.batches.findMany({

            include: {
                students: true
            }

        });
        console.log("Batches in database:", batches);

        const mappedBatches = batches.map(batch => ({
            id: batch.id,
            intake: batch.batch_intake,
            startDate: formatDate(batch.start_fyp_date),
            stage: batch.stage,
            batchCode: batch.batch_code,
            studentCount: batch.students.length
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

        if (!intake || !intake.toString().trim()) {
            return res.status(400).json({ message: "Intake name is required." });
        }

        const parsedStartDate = parseDate(startDate);
        if (!parsedStartDate) {
            return res.status(400).json({ message: "A valid start date is required." });
        }

        if (!students || students.length === 0) {
            const result = await prisma.$transaction(async (tx) => {

                if (batchCode) {
                    const existing = await tx.batches.findUnique({
                        where: { batch_code: batchCode }
                    });

                    if (existing) {
                        return await tx.batches.update({
                            where: { batch_code: batchCode },
                            data: {
                                batch_intake: intake,
                                start_fyp_date: parsedStartDate,
                                stage: stage || "Proposal"
                            }
                        });
                    }
                }

                const uniqueCode = await generateUniqueBatchCode(tx, batchCode || intake);

                return await tx.batches.create({
                    data: {
                        batch_code: uniqueCode,
                        batch_intake: intake,
                        start_fyp_date: parsedStartDate,
                        stage: stage || "Proposal"
                    }
                });
            });

            return res.status(201).json([{
                id: result.id,
                intake: result.batch_intake,
                startDate: formatDate(result.start_fyp_date),
                stage: result.stage,
                batchCode: result.batch_code
            }]);
        }

        const NO_CODE_KEY = "__NO_CODE__";
        const studentsByBatchCode = {};

        for (const s of students) {
            const code = s.batchCode || NO_CODE_KEY;
            if (!studentsByBatchCode[code]) {
                studentsByBatchCode[code] = [];
            }
            studentsByBatchCode[code].push(s);
        }

        const createdBatches = [];

        // ============================
        // 🔥 TRANSACTION (FAST ONLY)
        // ============================
        const result = await prisma.$transaction(async (tx) => {

            const batchResults = [];

            for (const [code, batchStudents] of Object.entries(studentsByBatchCode)) {

                let newBatch;

                if (code !== NO_CODE_KEY) {
                    let finalBatchCode = code;

                    const existing = await tx.batches.findUnique({
                        where: { batch_code: code }
                    });

                    if (existing) {
                        finalBatchCode = await generateUniqueBatchCode(tx, code);
                    }

                    newBatch = await tx.batches.create({
                        data: {
                            batch_code: finalBatchCode,
                            batch_intake: intake,
                            start_fyp_date: parsedStartDate,
                            stage: stage || "Proposal"
                        }
                    });

                } else {
                    const uniqueCode = await generateUniqueBatchCode(tx, batchCode || intake);

                    newBatch = await tx.batches.create({
                        data: {
                            batch_code: uniqueCode,
                            batch_intake: intake,
                            start_fyp_date: parsedStartDate,
                            stage: stage || "Proposal"
                        }
                    });
                }

                const cbNos = batchStudents.map(s => (s.studentNo || s.id).toUpperCase());

                const studentRecords = [];

                for (const s of batchStudents) {

                    const cbNo = (s.studentNo || s.id).toUpperCase();

                    const student = await tx.students.upsert({
                        where: { cb_no: cbNo },
                        update: {
                            student_name: s.name,
                            batch_id: newBatch.id
                        },
                        create: {
                            cb_no: cbNo,
                            student_name: s.name,
                            batch_id: newBatch.id
                        }
                    });

                    studentRecords.push(student);
                }

                const dbStudents = await tx.students.findMany({
                    where: { cb_no: { in: cbNos } },
                    include: { student_fyp_records: true }
                });

                const fypRecordsToCreate = dbStudents
                    .filter(s => !s.student_fyp_records || s.student_fyp_records.length === 0)
                    .map(s => ({
                        student_id: s.id,
                        supervisor_confirmation_status: "Pending"
                    }));

                if (fypRecordsToCreate.length > 0) {
                    await tx.student_fyp_records.createMany({
                        data: fypRecordsToCreate,
                        skipDuplicates: true
                    });
                }

                batchResults.push({
                    id: newBatch.id,
                    intake: newBatch.batch_intake,
                    startDate: formatDate(newBatch.start_fyp_date),
                    stage: newBatch.stage,
                    batchCode: newBatch.batch_code,
                    students: studentRecords
                });
            }

            return batchResults;
        });

        // ============================
        // 🔥 USER CREATION OUTSIDE TX
        // ============================
        for (const batch of result) {
            for (const s of batch.students) {

                const email = `${s.cb_no}@students.apiit.lk`;

                const existingUser = await prisma.users.findUnique({
                    where: { email }
                });

                if (!existingUser) {
                    await prisma.users.create({
                        data: {
                            email,
                            password: bcrypt.hashSync("123@abc", 10),
                            role: "student"
                        }
                    });
                }
            }
        }

        return res.status(201).json(result);

    } catch (error) {
        console.error("Failed to create batch:", error);
        return res.status(500).json({ message: "Failed to create batch" });
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

        await NotificationService.notifyBatch(
            updatedBatch.id,
            "Batch Stage Updated",
            `Your batch stage has been updated to "${stage}".`
        );

        res.json({
            id: updatedBatch.id,
            intake: updatedBatch.batch_intake,
            startDate: formatDate(updatedBatch.start_fyp_date),
            stage: updatedBatch.stage,
            batchCode: updatedBatch.batch_code
        });
    } catch (error) {
        console.error("Failed to update batch stage:", error);
        res.status(500).json({ message: "Failed to update batch stage" });
    }
};

const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { batchCode, intake, startDate, stage } = req.body;

        const parsedStartDate = parseDate(startDate);
        if (!parsedStartDate) {
            return res.status(400).json({ message: "A valid start date is required." });
        }
        if (batchCode && batchCode.length > 20) {
            return res.status(400).json({ message: "Batch code must be 20 characters or fewer." });
        }

        const updatedBatch = await prisma.batches.update({
            where: { id: parseInt(id, 10) },
            data: {
                batch_code: batchCode,
                batch_intake: intake,
                start_fyp_date: parsedStartDate,
                stage: stage
            }
        });

        res.json({
            id: updatedBatch.id,
            intake: updatedBatch.batch_intake,
            startDate: formatDate(updatedBatch.start_fyp_date),
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
        console.error(error);

        res.status(500).json({
            message: error.message,
            code: error.code,
            meta: error.meta
        });
    }
};

const addStudentToBatch = async (req, res) => {
    try {
        const { id } = req.params; // batch id
        const { studentName, cbNumber } = req.body;
        
        if (!studentName || !cbNumber) {
             return res.status(400).json({ message: "Student Name and CB Number are required" });
        }
        
        const cbNo = cbNumber.toUpperCase();

        const existingStudent = await prisma.students.findUnique({ where: { cb_no: cbNo } });
        if (existingStudent && existingStudent.batch_id === parseInt(id, 10)) {
            return res.status(400).json({ message: "Student is already in this batch" });
        }

        const student = await prisma.students.upsert({
            where: { cb_no: cbNo },
            update: {
                student_name: studentName,
                batch_id: parseInt(id, 10)
            },
            create: {
                cb_no: cbNo,
                student_name: studentName,
                batch_id: parseInt(id, 10)
            }
        });
        
        // Ensure FYP record exists
        const existingFyp = await prisma.student_fyp_records.findFirst({
            where: { student_id: student.id }
        });
        
        if (!existingFyp) {
            await prisma.student_fyp_records.create({
                data: {
                    student_id: student.id,
                    supervisor_confirmation_status: "Pending"
                }
            });
        }
        
        // Ensure User exists
        const email = `${cbNo}@students.apiit.lk`.toLowerCase();
        const existingUser = await prisma.users.findUnique({
            where: { email } 
        });
        
        if (!existingUser) {
            await prisma.users.create({
                data: {
                    email,
                    password: bcrypt.hashSync("123@abc", 10),
                    role: "student"
                }
            });
        }
        
        res.status(201).json(student);
    } catch (error) {
        console.error("Failed to add student to batch:", error);
        res.status(500).json({ message: "Failed to add student to batch" });
    }
};

module.exports = {
    getBatches,
    createBatch,
    updateBatchStage,
    updateBatch,
    deleteBatch,
    addStudentToBatch
};