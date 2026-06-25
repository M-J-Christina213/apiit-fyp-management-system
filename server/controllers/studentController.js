const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getStudents = async (req, res) => {
    try {
        const {
            name,
            cbNo,
            batchIntake,
            batchCode,
            supervisorName,
            allocationStatus,
            assessorName
        } = req.query;

        // Build Prisma where clause dynamically based on provided query params
        const whereClause = {};

        if (name && name !== 'All') whereClause.student_name = { contains: name, mode: 'insensitive' };
        if (cbNo && cbNo !== 'All') whereClause.cb_no = { contains: cbNo, mode: 'insensitive' };

        if ((batchIntake && batchIntake !== 'All') || (batchCode && batchCode !== 'All')) {
            whereClause.batches = {};
            if (batchIntake && batchIntake !== 'All') whereClause.batches.batch_intake = batchIntake;
            if (batchCode && batchCode !== 'All') whereClause.batches.batch_code = batchCode;
        }

        if ((supervisorName && supervisorName !== 'All') ||
            (allocationStatus && allocationStatus !== 'All') ||
            (assessorName && assessorName !== 'All')) {

            whereClause.student_fyp_records = {
                some: {}
            };

            if (allocationStatus && allocationStatus !== 'All') {
                if (allocationStatus.includes(',')) {
                    whereClause.student_fyp_records.some.supervisor_confirmation_status = { in: allocationStatus.split(',') };
                } else {
                    whereClause.student_fyp_records.some.supervisor_confirmation_status = allocationStatus;
                }
            }

            if (supervisorName && supervisorName !== 'All') {
                whereClause.student_fyp_records.some.supervisors = {
                    name: { contains: supervisorName, mode: 'insensitive' }
                };
            }

            if (assessorName && assessorName !== 'All') {
                whereClause.student_fyp_records.some.assessors = {
                    name: { contains: assessorName, mode: 'insensitive' }
                };
            }
        }

        const students = await prisma.students.findMany({
            where: whereClause,
            include: {
                batches: true,
                student_fyp_records: {
                    include: {
                        supervisors: true,
                        assessors: true
                    }
                }
            }
        });

        const formattedStudents = students.map((s) => {
            const fypRecord = s.student_fyp_records?.[0]; // Taking the first record if exists
            return {
                id: s.cb_no, // UI uses cb_no as ID/studentNo usually
                studentNo: s.cb_no,
                name: s.student_name,
                batch: s.batches ? s.batches.batch_intake : null,
                batchId: s.batch_id,
                batchCode: s.batches ? s.batches.batch_code : null,
                topic: fypRecord?.tentative_topic || null,
                supervisor: fypRecord?.supervisors ? `${fypRecord.supervisors.title || ""} ${fypRecord.supervisors.name}`.trim() : null,
                supervisorConfirmationStatus: fypRecord?.supervisor_confirmation_status || "Pending",
                assessor: fypRecord?.assessors ? `${fypRecord.assessors.title || ""} ${fypRecord.assessors.name}`.trim() : null,
            };
        });

        console.log(`[API Response] Returning ${formattedStudents.length} students matching criteria`);
        if (formattedStudents.length > 0) {
            console.log(`[API Response] Sample student:`, formattedStudents[0]);
        }

        res.json(formattedStudents);
    } catch (error) {
        console.error("Failed to fetch students:", error);
        res.status(500).json({ message: "Failed to fetch students" });
    }
};

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma.students.findUnique({
            where: { cb_no: id }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({
            id: student.cb_no,
            name: student.student_name,
            batchId: student.batch_id
        });
    } catch (error) {
        console.error("Failed to fetch student:", error);
        res.status(500).json({ message: "Failed to fetch student" });
    }
};

const createStudent = async (req, res) => {
    try {
        const { studentNo, name, batchId } = req.body;

        // Create student
        const newStudent = await prisma.students.create({
            data: {
                cb_no: studentNo,
                student_name: name,
                batch_id: batchId ? parseInt(batchId, 10) : null
            }
        });

        // Create corresponding FYP record with Pending status
        await prisma.student_fyp_records.create({
            data: {
                student_id: newStudent.id,
                supervisor_confirmation_status: 'Pending'
            }
        });

        res.status(201).json(newStudent);

    } catch (error) {
        console.error("Failed to create student:", error);
        res.status(500).json({ message: "Failed to create student" });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, batchId } = req.body;

        const updatedStudent = await prisma.students.update({
            where: { cb_no: id },
            data: {
                student_name: name,
                batch_id: batchId ? parseInt(batchId, 10) : null
            }
        });

        res.json(updatedStudent);
    } catch (error) {
        console.error("Failed to update student:", error);
        res.status(500).json({ message: "Failed to update student" });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.students.delete({
            where: { cb_no: id }
        });
        res.json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error("Failed to delete student:", error);
        res.status(500).json({ message: "Failed to delete student" });
    }
};

const allocateSupervisor = async (req, res) => {
    try {
        const { id } = req.params; // cb_no
        const { supervisorId } = req.body;

        const student = await prisma.students.findUnique({
            where: { cb_no: id }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const fypRecord = await prisma.student_fyp_records.findFirst({
            where: { student_id: student.id }
        });

        if (fypRecord) {
            await prisma.student_fyp_records.update({
                where: { id: fypRecord.id },
                data: {
                    supervisor_id: parseInt(supervisorId, 10),
                    supervisor_confirmation_status: 'Allocated'
                }
            });
        } else {
            await prisma.student_fyp_records.create({
                data: {
                    student_id: student.id,
                    supervisor_id: parseInt(supervisorId, 10),
                    supervisor_confirmation_status: 'Allocated'
                }
            });
        }

        const supervisor = await prisma.supervisors.findUnique({
            where: { id: parseInt(supervisorId, 10) }
        });

        if (supervisor && supervisor.preferred_supervision_slots > 0) {
            await prisma.supervisors.update({
                where: { id: supervisor.id },
                data: {
                    preferred_supervision_slots: supervisor.preferred_supervision_slots - 1
                }
            });
        }

        const user = await prisma.users.findFirst({
            where: { email: { startsWith: id, mode: 'insensitive' } }
        });

        if (user) {
            await prisma.notifications.create({
                data: {
                    user_id: user.id,
                    title: "Supervisor Assigned",
                    message: `A supervisor (${supervisor ? supervisor.name : ''}) has been assigned to you by the PM.`
                }
            });
        }

        res.json({ message: "Supervisor allocated successfully" });
    } catch (error) {
        console.error("Failed to allocate supervisor:", error);
        res.status(500).json({ message: "Failed to allocate supervisor" });
    }
};

const allocateAssessor = async (req, res) => {
    try {
        const { id } = req.params; // cb_no
        const { assessorId } = req.body;

        const student = await prisma.students.findUnique({
            where: { cb_no: id }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const fypRecord = await prisma.student_fyp_records.findFirst({
            where: { student_id: student.id }
        });

        if (!fypRecord) {
            return res.status(404).json({ message: "No FYP record found for student" });
        }

        // Conflict of interest check: assessor must not be the same person as supervisor
        if (fypRecord.supervisor_id && fypRecord.supervisor_id === parseInt(assessorId, 10)) {
            return res.status(400).json({ message: "Conflict of interest: Supervisor cannot be assigned as assessor" });
        }

        // Update the assessor_id in student_fyp_records
        await prisma.student_fyp_records.update({
            where: { id: fypRecord.id },
            data: {
                assessor_id: parseInt(assessorId, 10)
            }
        });

        const assessor = await prisma.assessors.findUnique({
            where: { id: parseInt(assessorId, 10) }
        });

        // Create notification for the student
        const user = await prisma.users.findFirst({
            where: { email: { startsWith: id, mode: 'insensitive' } }
        });

        if (user) {
            await prisma.notifications.create({
                data: {
                    user_id: user.id,
                    title: "Assessor Assigned",
                    message: `An assessor (${assessor ? `${assessor.title || ''} ${assessor.name}`.trim() : ''}) has been assigned to you by the PM.`
                }
            });
        }

        res.json({ message: "Assessor allocated successfully" });
    } catch (error) {
        console.error("Failed to allocate assessor:", error);
        res.status(500).json({ message: "Failed to allocate assessor" });
    }
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    allocateSupervisor,
    allocateAssessor
};
