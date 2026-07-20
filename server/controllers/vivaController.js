const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const vivaSchedulingService = require("../services/vivaSchedulingService");

// Admin: Get all periods
exports.getVivaPeriods = async (req, res) => {
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
    const { type, start_date, end_date } = req.body;
    try {
        const period = await prisma.viva_periods.create({
            data: {
                type,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
                status: "Availability Collection"
            }
        });
        res.status(201).json(period);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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
                start_time: new Date(`${date}T${start_time}Z`), // Simple format for now
                end_time: new Date(`${date}T${end_time}Z`),
            }
        });
        res.status(201).json(avail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Trigger Auto Scheduling
exports.triggerAutoScheduling = async (req, res) => {
    const { periodId } = req.params;
    try {
        const schedules = await vivaSchedulingService.generateSchedules(periodId);
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

// Admin: Update Schedule (Confirm Venue)
exports.updateSchedule = async (req, res) => {
    const { id } = req.params;
    const { venue, mode, status } = req.body;
    try {
        const schedule = await prisma.viva_schedules.update({
            where: { id: parseInt(id) },
            data: { venue, mode, status }
        });
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
