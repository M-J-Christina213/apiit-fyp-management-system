const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
    try {
        // ---------- Card counts ----------
        const unassignedStudents = await prisma.student_fyp_records.count({
            where: { supervisor_confirmation_status: "Pending" },
        });

        const confirmedSupervisors = await prisma.student_fyp_records.count({
            where: { supervisor_confirmation_status: "Confirmed" },
        });


        const pmAssignedStudents = await prisma.student_fyp_records.count({
            where: {
                supervisor_id: { not: null },
                students: { is: { proposal_requests: { none: {} } } },
            },
        });

        // ---------- Allocation status breakdown (pie) ----------
        const statusGroups = await prisma.student_fyp_records.groupBy({
            by: ["supervisor_confirmation_status"],
            _count: { _all: true },
        });
        const allocationStatusChart = statusGroups.map((g) => ({
            name: g.supervisor_confirmation_status || "Unknown",
            value: g._count._all,
        }));

        // ---------- Batch stage breakdown (pie) ----------
        const stageGroups = await prisma.batches.groupBy({
            by: ["stage"],
            _count: { _all: true },
        });
        const batchStageChart = stageGroups.map((g) => ({
            name: g.stage || "Unspecified",
            value: g._count._all,
        }));

        // ---------- Supervisor workload (bar, top 8) ----------
        const workloadGroups = await prisma.student_fyp_records.groupBy({
            by: ["supervisor_id"],
            _count: { _all: true },
            where: { supervisor_id: { not: null } },
            orderBy: { _count: { supervisor_id: "desc" } },
            take: 8,
        });

        const supervisorIds = workloadGroups.map((g) => g.supervisor_id);
        const supervisorDetails = await prisma.supervisors.findMany({
            where: { id: { in: supervisorIds } },
            select: { id: true, name: true, preferred_supervision_slots: true },
        });

        const supervisorWorkload = workloadGroups.map((g) => {
            const sup = supervisorDetails.find((s) => s.id === g.supervisor_id);
            return {
                name: sup?.name || `Supervisor #${g.supervisor_id}`,
                assigned: g._count._all,
                capacity: sup?.preferred_supervision_slots || 0,
            };
        });

        res.json({
            cards: { unassignedStudents, confirmedSupervisors, pmAssignedStudents },
            allocationStatusChart,
            batchStageChart,
            supervisorWorkload,
        });
    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ error: "Failed to load dashboard stats" });
    }
};

module.exports = { getDashboardStats };