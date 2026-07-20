const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const schedulingService = require("../services/schedulingService");

// Admin: Get all active stages
exports.getVivaStages = async (req, res) => {
    try {
        const periods = await prisma.viva_periods.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.status(200).json(periods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Create Viva Period
exports.createVivaPeriod = async (req, res) => {
    const { type, availability_start, availability_end, viva_start, viva_end } = req.body;
    try {
        const period = await prisma.viva_periods.create({
            data: {
                type,
                availability_start: new Date(availability_start),
                availability_end: new Date(availability_end),
                viva_start: new Date(viva_start),
                viva_end: new Date(viva_end),
                status: "Active"
            }
        });
        res.status(201).json(period);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const activePeriods = await prisma.viva_periods.count({ where: { status: "Active" } });
        const totalSchedules = await prisma.viva_schedules.count();
        const totalAvailabilities = await prisma.viva_availabilities.count();
        
        res.status(200).json({
            activePeriods,
            totalSchedules,
            totalAvailabilities
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Users: Submit Availability
exports.submitAvailability = async (req, res) => {
    const { supervisor_id, assessor_id, student_id, date, start_time, end_time } = req.body;
    try {
        const avail = await prisma.viva_availabilities.create({
            data: {
                supervisor_id,
                assessor_id,
                student_id,
                date: new Date(date),
                start_time: new Date(`${date}T${start_time}:00Z`),
                end_time: new Date(`${date}T${end_time}:00Z`),
            }
        });
        res.status(201).json(avail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Users: Get Availability
exports.getAvailability = async (req, res) => {
    const { supervisor_id, assessor_id, student_id } = req.query;
    try {
        const query = {};
        if (supervisor_id) query.supervisor_id = parseInt(supervisor_id);
        if (assessor_id) query.assessor_id = parseInt(assessor_id);
        if (student_id) query.student_id = parseInt(student_id);

        const avail = await prisma.viva_availabilities.findMany({
            where: query
        });
        res.status(200).json(avail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Trigger Auto Scheduling
exports.triggerAutoScheduling = async (req, res) => {
    const { periodId } = req.body;
    try {
        const schedules = await schedulingService.generateSchedules(periodId);
        res.status(200).json({ message: "Scheduling complete", schedules });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// All: Get Schedules
exports.getSchedules = async (req, res) => {
    const { periodId } = req.query;
    try {
        const schedules = await prisma.viva_schedules.findMany({
            where: periodId ? { viva_period_id: parseInt(periodId) } : {},
            include: {
                students: true,
                supervisors: true,
                assessors: true,
                viva_periods: true
            }
        });
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
