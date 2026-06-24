const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getSupervisors = async (req, res) => {
    try {
        const supervisors = await prisma.supervisors.findMany({
            include: {
                student_fyp_records: true
            }
        });

        const formatted = supervisors.map(s => {
            const confirmedRecords = s.student_fyp_records.filter(r => r.supervisor_confirmation_status === 'Confirmed');
            const usedSlots = confirmedRecords.length;
            const availableSlots = Math.max(0, s.preferred_supervision_slots - usedSlots);

            return {
                id: s.id,
                title: s.title,
                name: s.name,
                email: s.email,
                expertise: s.expertise,
                interests: s.research_interests,
                preferredSlots: s.preferred_supervision_slots,
                availableSlots,
                status: availableSlots > 0 ? "Available" : "Full"
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("Failed to fetch supervisors:", error);
        res.status(500).json({ message: "Failed to fetch supervisors" });
    }
};

const createSupervisor = async (req, res) => {
    try {
        const { title, name, email, supervisor_type, expertise, research_interests, preferred_supervision_slots } = req.body;
        const newSupervisor = await prisma.supervisors.create({
            data: {
                title,
                name,
                email,
                supervisor_type: supervisor_type || 'Internal',
                expertise,
                research_interests,
                preferred_supervision_slots: parseInt(preferred_supervision_slots, 10) || 3
            }
        });
        res.status(201).json(newSupervisor);
    } catch (error) {
        console.error("Failed to create supervisor:", error);
        res.status(500).json({ message: "Failed to create supervisor" });
    }
};

const uploadSupervisors = async (req, res) => {
    try {
        const importedSupervisors = req.body;
        
        await prisma.$transaction(async (tx) => {
            // Completely replace previous supervisor dataset
            await tx.supervisors.deleteMany({});
            
            for (const sup of importedSupervisors) {
                await tx.supervisors.create({
                    data: {
                        title: sup.title,
                        name: sup.name,
                        email: sup.email,
                        supervisor_type: "Internal",
                        expertise: sup.expertise,
                        research_interests: sup.interests,
                        preferred_supervision_slots: sup.preferredSlots || 3
                    }
                });
            }
        });

        res.json({ message: "Supervisors replaced successfully", count: importedSupervisors.length });
    } catch (error) {
        console.error("Failed to upload supervisors:", error);
        res.status(500).json({ message: "Failed to upload supervisors" });
    }
};

const clearAllSupervisors = async (req, res) => {
    try {
        await prisma.supervisors.deleteMany({});
        res.json({ message: "All supervisors cleared successfully" });
    } catch (error) {
        console.error("Failed to clear supervisors:", error);
        res.status(500).json({ message: "Failed to clear supervisors" });
    }
};

const updateSupervisor = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, name, email, supervisor_type, expertise, research_interests, preferred_supervision_slots } = req.body;
        
        const updated = await prisma.supervisors.update({
            where: { id: parseInt(id, 10) },
            data: {
                title,
                name,
                email,
                supervisor_type,
                expertise,
                research_interests,
                preferred_supervision_slots: parseInt(preferred_supervision_slots, 10) || 3
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Failed to update supervisor:", error);
        res.status(500).json({ message: "Failed to update supervisor" });
    }
};

const deleteSupervisor = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.supervisors.delete({
            where: { id: parseInt(id, 10) }
        });
        res.json({ message: "Supervisor deleted successfully" });
    } catch (error) {
        console.error("Failed to delete supervisor:", error);
        res.status(500).json({ message: "Failed to delete supervisor" });
    }
};

module.exports = {
    getSupervisors,
    createSupervisor,
    uploadSupervisors,
    clearAllSupervisors,
    updateSupervisor,
    deleteSupervisor
};
