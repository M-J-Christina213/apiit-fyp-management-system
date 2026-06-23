const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAssessors = async (req, res) => {
    try {
        const assessors = await prisma.assessors.findMany();
        res.json(assessors);
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
    updateAssessor,
    deleteAssessor
};
