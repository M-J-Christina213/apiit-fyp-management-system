const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const schedulingService = require("../services/vivaSchedulingService");

// ======================================================
// ADMIN - GET ALL VIVA PERIODS
// ======================================================
exports.getVivaPeriods = async (req, res) => {
    try {
        const periods = await prisma.viva_periods.findMany({
            orderBy: { created_at: "desc" },
            include: {
                viva_period_batches: {
                    include: { batches: true }
                },
                _count: {
                    select: { viva_availabilities: true, viva_schedules: true }
                }
            }
        });
        res.status(200).json(periods);
    } catch (error) {
        console.error("Get Viva Periods Error:", error);
        res.status(500).json({ error: "Failed to fetch Viva Periods", details: error.message });
    }
};

// ======================================================
// ADMIN - GET SINGLE VIVA PERIOD
// ======================================================
exports.getVivaPeriodById = async (req, res) => {
    const periodId = parseInt(req.params.id);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: {
                viva_period_batches: {
                    include: { batches: true }
                },
                _count: {
                    select: { viva_availabilities: true, viva_schedules: true }
                }
            }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });
        res.status(200).json(period);
    } catch (error) {
        console.error("Get Viva Period Error:", error);
        res.status(500).json({ error: "Failed to fetch Viva Period", details: error.message });
    }
};

// ======================================================
// ADMIN - CREATE VIVA PERIOD
// ======================================================
exports.createVivaPeriod = async (req, res) => {
    const { type, intake, batches, start_date, end_date, daily_start_time, daily_end_time, slot_duration } = req.body;

    if (!type || !intake || !batches || !batches.length || !start_date || !end_date || !daily_start_time || !daily_end_time || !slot_duration) {
        return res.status(400).json({ error: "All Viva Period fields are required" });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: "Invalid date format" });
    if (start > end) return res.status(400).json({ error: "End date must be after or equal to start date." });

    const [startHour, startMin] = daily_start_time.split(":").map(Number);
    const [endHour, endMin] = daily_end_time.split(":").map(Number);
    const startTimeMins = startHour * 60 + startMin;
    const endTimeMins = endHour * 60 + endMin;

    if (endTimeMins <= startTimeMins) return res.status(400).json({ error: "Daily end time must be after daily start time." });

    const duration = parseInt(slot_duration, 10);
    if (![15, 30, 45, 60].includes(duration)) return res.status(400).json({ error: "Time slot duration must be 15, 30, 45, or 60 minutes." });

    try {
        const period = await prisma.viva_periods.create({
            data: {
                type,
                intake,
                start_date: start,
                end_date: end,
                daily_start_time,
                daily_end_time,
                slot_duration: duration,
                status: "Draft",
                viva_period_batches: {
                    create: batches.map(batch_id => ({ batch_id }))
                }
            }
        });
        res.status(201).json({ message: "Viva Period created successfully", period });
    } catch (error) {
        console.error("Create Viva Period Error:", error);
        res.status(500).json({ error: "Failed to create Viva Period", details: error.message });
    }
};

// ======================================================
// ADMIN - UPDATE VIVA PERIOD
// ======================================================
exports.updateVivaPeriod = async (req, res) => {
    const periodId = parseInt(req.params.id);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    const { type, intake, batches, start_date, end_date, daily_start_time, daily_end_time, slot_duration, status } = req.body;

    try {
        const existingPeriod = await prisma.viva_periods.findUnique({ where: { id: periodId } });
        if (!existingPeriod) return res.status(404).json({ error: "Viva Period not found" });

        const updatedData = { ...(type && { type }), ...(intake && { intake }), ...(status && { status }) };
        if (start_date) updatedData.start_date = new Date(start_date);
        if (end_date) updatedData.end_date = new Date(end_date);
        if (daily_start_time) updatedData.daily_start_time = daily_start_time;
        if (daily_end_time) updatedData.daily_end_time = daily_end_time;
        if (slot_duration) updatedData.slot_duration = parseInt(slot_duration, 10);

        if (batches) {
            await prisma.viva_period_batches.deleteMany({ where: { viva_period_id: periodId } });
            updatedData.viva_period_batches = {
                create: batches.map(batch_id => ({ batch_id }))
            };
        }

        const updatedPeriod = await prisma.viva_periods.update({
            where: { id: periodId },
            data: updatedData
        });

        res.status(200).json({ message: "Viva Period updated successfully", period: updatedPeriod });
    } catch (error) {
        console.error("Update Viva Period Error:", error);
        res.status(500).json({ error: "Failed to update Viva Period", details: error.message });
    }
};

// ======================================================
// ADMIN - DELETE VIVA PERIOD
// ======================================================
exports.deleteVivaPeriod = async (req, res) => {
    const periodId = parseInt(req.params.id);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        await prisma.viva_periods.delete({ where: { id: periodId } });
        res.status(200).json({ message: "Viva Period deleted successfully" });
    } catch (error) {
        console.error("Delete Viva Period Error:", error);
        res.status(500).json({ error: "Failed to delete Viva Period", details: error.message });
    }
};

// ======================================================
// ADMIN - PUBLISH VIVA PERIOD
// ======================================================
exports.publishVivaPeriod = async (req, res) => {
    const periodId = parseInt(req.params.id);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const period = await prisma.viva_periods.update({
            where: { id: periodId },
            data: { status: "AVAILABILITY_OPEN" }
        });
        res.status(200).json({ message: "Viva Period published successfully.", period });
    } catch (error) {
        console.error("Publish Viva Period Error:", error);
        res.status(500).json({ error: "Failed to publish Viva Period", details: error.message });
    }
};

// ======================================================
// ADMIN - DASHBOARD STATISTICS
// ======================================================
exports.getDashboardStats = async (req, res) => {
    try {
        const [activePeriods, totalSchedules, totalAvailabilities, pendingPeriods] = await Promise.all([
            prisma.viva_periods.count({ where: { status: { in: ["AVAILABILITY_OPEN", "SCHEDULING", "SCHEDULE_GENERATED"] } } }),
            prisma.viva_schedules.count(),
            prisma.viva_availabilities.count(),
            prisma.viva_periods.count({ where: { status: "Draft" } })
        ]);
        res.status(200).json({ activePeriods, totalSchedules, totalAvailabilities, pendingPeriods });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch dashboard statistics", details: error.message });
    }
};

// ======================================================
// AVAILABILITY - STATUS
// ======================================================
exports.getAvailabilityStatus = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: { viva_period_batches: true }
        });

        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        const batchIds = period.viva_period_batches.map(b => b.batch_id);

        const [supervisorCount, assessorCount, studentCount] = await Promise.all([
            prisma.supervisors.count({
                where: {
                    student_fyp_records: { some: { students: { batch_id: { in: batchIds } } } }
                }
            }),
            prisma.assessors.count({
                where: {
                    student_fyp_records: { some: { students: { batch_id: { in: batchIds } } } }
                }
            }),
            prisma.students.count({ where: { batch_id: { in: batchIds } } })
        ]);

        const [submittedSupervisors, submittedAssessors, submittedStudents] = await Promise.all([
            prisma.viva_availabilities.findMany({
                where: { viva_period_id: periodId, supervisor_id: { not: null } },
                distinct: ["supervisor_id"]
            }),
            prisma.viva_availabilities.findMany({
                where: { viva_period_id: periodId, assessor_id: { not: null } },
                distinct: ["assessor_id"]
            }),
            prisma.viva_availabilities.findMany({
                where: { viva_period_id: periodId, student_id: { not: null } },
                distinct: ["student_id"]
            })
        ]);

        res.status(200).json({
            periodId,
            supervisors: { total: supervisorCount, submitted: submittedSupervisors.length, pending: supervisorCount - submittedSupervisors.length },
            assessors: { total: assessorCount, submitted: submittedAssessors.length, pending: assessorCount - submittedAssessors.length },
            students: { total: studentCount, submitted: submittedStudents.length, pending: studentCount - submittedStudents.length }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch availability status", details: error.message });
    }
};

// ======================================================
// AVAILABILITY - SUBMIT & GET
// ======================================================
exports.submitAvailability = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    const { supervisor_id, assessor_id, student_id, slots } = req.body;
    // expect slots to be an array of { date, start_time, end_time }

    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    const providedUsers = [supervisor_id, assessor_id, student_id].filter(id => id !== undefined && id !== null);
    if (providedUsers.length !== 1) return res.status(400).json({ error: "Availability must belong to exactly one user type" });

    try {
        const period = await prisma.viva_periods.findUnique({ where: { id: periodId } });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        // Delete existing availability for this user for this period to completely overwrite
        await prisma.viva_availabilities.deleteMany({
            where: {
                viva_period_id: periodId,
                supervisor_id: supervisor_id ? parseInt(supervisor_id) : undefined,
                assessor_id: assessor_id ? parseInt(assessor_id) : undefined,
                student_id: student_id ? parseInt(student_id) : undefined
            }
        });

        // Insert new slots
        if (slots && slots.length > 0) {
            const data = slots.map(slot => ({
                viva_period_id: periodId,
                supervisor_id: supervisor_id ? parseInt(supervisor_id) : null,
                assessor_id: assessor_id ? parseInt(assessor_id) : null,
                student_id: student_id ? parseInt(student_id) : null,
                date: new Date(slot.date),
                start_time: new Date(`${slot.date.split("T")[0]}T${slot.start_time}:00Z`),
                end_time: new Date(`${slot.date.split("T")[0]}T${slot.end_time}:00Z`)
            }));
            await prisma.viva_availabilities.createMany({ data });
        }

        res.status(201).json({ message: "Availability submitted successfully" });
    } catch (error) {
        console.error("Submit Availability Error:", error);
        res.status(500).json({ error: "Failed to submit availability", details: error.message });
    }
};

exports.getAvailability = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    const { supervisor_id, assessor_id, student_id } = req.query;

    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const where = { viva_period_id: periodId };
        if (supervisor_id) where.supervisor_id = parseInt(supervisor_id);
        if (assessor_id) where.assessor_id = parseInt(assessor_id);
        if (student_id) where.student_id = parseInt(student_id);

        const availability = await prisma.viva_availabilities.findMany({
            where,
            orderBy: [{ date: "asc" }, { start_time: "asc" }]
        });

        res.status(200).json(availability);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch availability", details: error.message });
    }
};

// ======================================================
// AUTOMATIC SCHEDULING
// ======================================================
exports.triggerAutoScheduling = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        await prisma.viva_periods.update({
            where: { id: periodId },
            data: { status: "SCHEDULING" }
        });

        const schedules = await schedulingService.generateSchedules(periodId);
        res.status(200).json({ message: "Scheduling completed successfully", schedules });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate schedules", details: error.message });
    }
};

// ======================================================
// SCHEDULES - GET, UPDATE, FINALIZE, EXPORT
// ======================================================
exports.getSchedules = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const schedules = await prisma.viva_schedules.findMany({
            where: { viva_period_id: periodId },
            include: {
                students: { include: { batches: true, student_fyp_records: true } },
                supervisors: true,
                assessors: true,
                viva_periods: true
            },
            orderBy: [{ date: "asc" }, { start_time: "asc" }]
        });
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch schedules", details: error.message });
    }
};

exports.updateSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });
    const { date, start_time, end_time, mode, venue } = req.body;

    try {
        const updatedSchedule = await prisma.viva_schedules.update({
            where: { id: scheduleId },
            data: {
                ...(date && { date: new Date(date) }),
                ...(start_time && { start_time: new Date(start_time) }),
                ...(end_time && { end_time: new Date(end_time) }),
                ...(mode && { mode }),
                ...(venue && { venue })
            }
        });
        res.status(200).json({ message: "Schedule updated successfully", schedule: updatedSchedule });
    } catch (error) {
        res.status(500).json({ error: "Failed to update schedule", details: error.message });
    }
};

exports.finalizeSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });

    try {
        const updatedSchedule = await prisma.viva_schedules.update({
            where: { id: scheduleId },
            data: { status: "FINALIZED" }
        });
        res.status(200).json({ message: "Schedule finalized successfully", schedule: updatedSchedule });
    } catch (error) {
        res.status(500).json({ error: "Failed to finalize schedule", details: error.message });
    }
};

exports.exportSchedules = async (req, res) => {
    const periodId = parseInt(req.params.id);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const schedules = await prisma.viva_schedules.findMany({
            where: { viva_period_id: periodId, status: "FINALIZED" },
            include: { students: true, supervisors: true, assessors: true, viva_periods: true },
            orderBy: [{ date: "asc" }, { start_time: "asc" }]
        });
        let csv = "Stage,Student Name,Student ID,Supervisor,Assessor,Date,Start Time,End Time,Duration,Mode,Venue,Status\n";
        schedules.forEach(sch => {
            csv += `"${sch.viva_periods.type}","${sch.students.student_name}","${sch.students.cb_no}","${sch.supervisors?.name || ''}","${sch.assessors?.name || ''}","${sch.date ? new Date(sch.date).toLocaleDateString() : ''}","${sch.start_time ? new Date(sch.start_time).toLocaleTimeString() : ''}","${sch.end_time ? new Date(sch.end_time).toLocaleTimeString() : ''}","${sch.duration_mins}","${sch.mode || ''}","${sch.venue || ''}","${sch.status}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="viva-schedules-${periodId}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ error: "Failed to export schedules", details: error.message });
    }
};

// ======================================================
// PARTICIPANT - GET MY DASHBOARD
// ======================================================
exports.getMyDashboard = async (req, res) => {
    const { role, id } = req.params;
    const userId = parseInt(id);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid User ID" });

    try {
        let periods = [];
        if (role === 'student') {
            const student = await prisma.students.findUnique({ where: { id: userId } });
            if (student?.batch_id) {
                periods = await prisma.viva_periods.findMany({
                    where: { 
                        viva_period_batches: { some: { batch_id: student.batch_id } },
                        status: { not: "Draft" }
                    },
                    orderBy: { created_at: "desc" }
                });
            }
        } else if (role === 'supervisor') {
            periods = await prisma.viva_periods.findMany({
                where: {
                    viva_period_batches: {
                        some: {
                            batches: {
                                students: { some: { student_fyp_records: { some: { supervisor_id: userId } } } }
                            }
                        }
                    },
                    status: { not: "Draft" }
                },
                orderBy: { created_at: "desc" }
            });
        } else if (role === 'assessor') {
            periods = await prisma.viva_periods.findMany({
                where: {
                    viva_period_batches: {
                        some: {
                            batches: {
                                students: { some: { student_fyp_records: { some: { assessor_id: userId } } } }
                            }
                        }
                    },
                    status: { not: "Draft" }
                },
                orderBy: { created_at: "desc" }
            });
        }

        const filterField = role === 'student' ? 'student_id' : role === 'supervisor' ? 'supervisor_id' : 'assessor_id';
        const availabilities = await prisma.viva_availabilities.findMany({ where: { [filterField]: userId } });
        const schedules = await prisma.viva_schedules.findMany({
            where: { [filterField]: userId, status: "FINALIZED" },
            include: { viva_periods: true, students: true, supervisors: true, assessors: true }
        });

        res.status(200).json({ periods, availabilities, schedules });
    } catch (error) {
        console.error("Get My Dashboard Error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data", details: error.message });
    }
};