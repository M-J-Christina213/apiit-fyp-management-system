const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAssessors = async (req, res) => {
    try {
        const assessors = await prisma.assessors.findMany({
            include: {
                student_fyp_records: {
                    include: {
                        students: true,
                        supervisors: true
                    }
                }
            }
        });

        const formatted = assessors.map(a => {
            const assignedRecords = a.student_fyp_records || [];
            const assignedStudentCount = assignedRecords.length;

            const assignedStudents = assignedRecords.map(r => ({
                cbNo: r.students?.cb_no || '',
                name: r.students?.student_name || '',
                topic: r.tentative_topic || '',
                supervisor: r.supervisors
                    ? `${r.supervisors.title || ''} ${r.supervisors.name}`.trim()
                    : ''
            }));

            return {
                id: a.id,
                title: a.title,
                name: a.name,
                email: a.email,
                expertise: a.expertise,
                research_interests: a.research_interests,
                assignedStudentCount,
                assignedStudents,
                availability: assignedStudentCount === 0 ? 'Available' : 'Assigned'
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("Failed to fetch assessors:", error);
        res.status(500).json({ message: "Failed to fetch assessors" });
    }
};

const createAssessor = async (req, res) => {
    try {
        const { title, name, email, expertise, research_interests } = req.body;
        const newAssessor = await prisma.assessors.create({
            data: {
                title,
                name,
                email,
                expertise,
                research_interests
            }
        });
        res.status(201).json(newAssessor);
    } catch (error) {
        console.error("Failed to create assessor:", error);
        res.status(500).json({ message: "Failed to create assessor" });
    }
};

const uploadAssessors = async (req, res) => {
    try {
        const assessorList = req.body; // array of { title, name, email, expertise, research_interests }
        if (!Array.isArray(assessorList) || assessorList.length === 0) {
            return res.status(400).json({ message: "No assessors provided" });
        }

        const results = [];
        for (const a of assessorList) {
            if (!a.email) continue;
            const upserted = await prisma.assessors.upsert({
                where: { email: a.email },
                update: {
                    title: a.title || null,
                    name: a.name,
                    expertise: a.expertise || null,
                    research_interests: a.research_interests || null
                },
                create: {
                    title: a.title || null,
                    name: a.name,
                    email: a.email,
                    expertise: a.expertise || null,
                    research_interests: a.research_interests || null
                }
            });
            results.push(upserted);
        }

        res.status(201).json({ message: `Upserted ${results.length} assessors`, count: results.length });
    } catch (error) {
        console.error("Failed to upload assessors:", error);
        res.status(500).json({ message: "Failed to upload assessors" });
    }
};

const updateAssessor = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, name, email, expertise, research_interests } = req.body;
        const updated = await prisma.assessors.update({
            where: { id: parseInt(id, 10) },
            data: {
                title,
                name,
                email,
                expertise,
                research_interests
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Failed to update assessor:", error);
        res.status(500).json({ message: "Failed to update assessor" });
    }
};

const deleteAssessor = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.assessors.delete({
            where: { id: parseInt(id, 10) }
        });
        res.json({ message: "Assessor deleted successfully" });
    } catch (error) {
        console.error("Failed to delete assessor:", error);
        res.status(500).json({ message: "Failed to delete assessor" });
    }
};

module.exports = {
    getAssessors,
    createAssessor,
    uploadAssessors,
    updateAssessor,
    deleteAssessor
};
