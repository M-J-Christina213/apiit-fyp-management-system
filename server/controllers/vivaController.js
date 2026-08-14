const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const schedulingService = require("../services/vivaSchedulingService");

// ======================================================
// ADMIN - GET BATCHES WITH STUDENTS FOR VIVA CREATE
// ======================================================
exports.getBatchesWithStudents = async (req, res) => {
    try {
        const batches = await prisma.batches.findMany({
            include: {
                students: {
                    select: { id: true, student_name: true, cb_no: true }
                }
            }
        });
        res.status(200).json(batches);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch batches", details: error.message });
    }
};

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
    const { intake, batches, start_date, end_date, daily_start_time, daily_end_time, slot_duration } = req.body;

    if (!intake || !batches || !batches.length || !start_date || !end_date || !daily_start_time || !daily_end_time || !slot_duration) {
        return res.status(400).json({ error: "Missing required Viva Period fields." });
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
        // Fetch batches to validate stage
        const dbBatches = await prisma.batches.findMany({
            where: { id: { in: batches } }
        });
        
        if (dbBatches.length === 0) return res.status(400).json({ error: "Selected batches do not exist." });
        
        const stages = [...new Set(dbBatches.map(b => b.stage))];
        if (stages.length > 1) {
            return res.status(400).json({ error: "Selected batches belong to different FYP stages. Please select batches belonging to the same Viva stage." });
        }
        
        const type = `${stages[0]} Viva`;

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
// PARTICIPANT - GET MY PERIODS (resolves by email)
// ======================================================
exports.getMyPeriods = async (req, res) => {
    const role = req.headers['x-user-role'];
    const email = req.headers['x-user-email'];

    if (!role || !email) {
        return res.status(400).json({ error: "Role and email headers are required" });
    }

    console.log(`[DEBUG] getMyPeriods - role: ${role}, email: ${email}`);

    try {
        let periods = [];
        let participantId = null;

        if (role === 'student') {
            // Derive cb_no from email prefix (matches existing StudentDashboard pattern)
            const cbNo = email.split('@')[0].toUpperCase();
            console.log(`[DEBUG] Looking up student with cb_no: ${cbNo}`);

            const student = await prisma.students.findUnique({ where: { cb_no: cbNo } });
            console.log(`[DEBUG] Student found:`, student ? `id=${student.id}, batch_id=${student.batch_id}` : 'NOT FOUND');

            if (!student?.batch_id) {
                return res.status(200).json({ periods: [], availabilities: [], schedules: [], participantId: null });
            }

            participantId = student.id;

            const allPeriods = await prisma.viva_periods.findMany({
                where: { status: { not: 'Draft' } },
                include: {
                    viva_period_batches: { include: { batches: { include: { students: { select: { id: true, student_name: true, cb_no: true } } } } } }
                },
                orderBy: { start_date: 'asc' }
            });

            console.log(`[DEBUG] Total non-draft periods: ${allPeriods.length}`);
            allPeriods.forEach(p => {
                const batchIds = p.viva_period_batches.map(vpb => vpb.batch_id);
                console.log(`[DEBUG] Period ${p.id} (${p.type}) batchIds:`, batchIds, `student.batch_id:`, student.batch_id);
            });

            periods = allPeriods.filter(p =>
                p.viva_period_batches.some(vpb => vpb.batch_id === student.batch_id)
            );
            console.log(`[DEBUG] Periods matching student batch: ${periods.length}`);

        } else if (role === 'academic') {
            const supervisor = await prisma.supervisors.findUnique({ where: { email } });
            const assessor = await prisma.assessors.findUnique({ where: { email } });

            const supervisorId = supervisor ? supervisor.id : null;
            const assessorId = assessor ? assessor.id : null;

            console.log(`[DEBUG] Academic staff found: SupervisorID=${supervisorId}, AssessorID=${assessorId}`);

            if (!supervisorId && !assessorId) {
                return res.status(200).json({ periods: [], availabilities: [], schedules: [], supervisorId: null, assessorId: null });
            }

            let assignedBatchIds = new Set();
            let supervisorBatchIds = new Set();
            let assessorBatchIds = new Set();

            if (supervisorId) {
                const supRecords = await prisma.student_fyp_records.findMany({
                    where: { supervisor_id: supervisorId },
                    include: { students: { select: { batch_id: true } } }
                });
                supRecords.forEach(r => {
                    if (r.students?.batch_id) {
                        assignedBatchIds.add(r.students.batch_id);
                        supervisorBatchIds.add(r.students.batch_id);
                    }
                });
            }

            if (assessorId) {
                const assRecords = await prisma.student_fyp_records.findMany({
                    where: { assessor_id: assessorId },
                    include: { students: { select: { batch_id: true } } }
                });
                assRecords.forEach(r => {
                    if (r.students?.batch_id) {
                        assignedBatchIds.add(r.students.batch_id);
                        assessorBatchIds.add(r.students.batch_id);
                    }
                });
            }

            const batchIdsArray = Array.from(assignedBatchIds);
            console.log(`[DEBUG] Academic staff assigned batch IDs:`, batchIdsArray);

            if (batchIdsArray.length === 0) {
                return res.status(200).json({ periods: [], availabilities: [], schedules: [], supervisorId, assessorId });
            }

            const allPeriods = await prisma.viva_periods.findMany({
                where: {
                    status: { not: 'Draft' },
                    viva_period_batches: { some: { batch_id: { in: batchIdsArray } } }
                },
                include: {
                    viva_period_batches: { include: { batches: { include: { students: { select: { id: true, student_name: true, cb_no: true } } } } } }
                },
                orderBy: { start_date: 'asc' }
            });

            // Map each period with context flags (isSupervisor, isAssessor)
            periods = allPeriods.map(p => {
                const periodBatchIds = p.viva_period_batches.map(vpb => vpb.batch_id);
                return {
                    ...p,
                    isSupervisor: periodBatchIds.some(id => supervisorBatchIds.has(id)),
                    isAssessor: periodBatchIds.some(id => assessorBatchIds.has(id))
                };
            });

            // Availabilities and schedules need to be fetched for BOTH roles if they exist
            const availabilities = await prisma.viva_availabilities.findMany({
                where: {
                    OR: [
                        supervisorId ? { supervisor_id: supervisorId } : undefined,
                        assessorId ? { assessor_id: assessorId } : undefined
                    ].filter(Boolean)
                }
            });

            const schedules = await prisma.viva_schedules.findMany({
                where: {
                    status: 'FINALIZED',
                    OR: [
                        supervisorId ? { supervisor_id: supervisorId } : undefined,
                        assessorId ? { assessor_id: assessorId } : undefined
                    ].filter(Boolean)
                },
                include: { viva_periods: true, students: true, supervisors: true, assessors: true }
            });

            return res.status(200).json({ periods, availabilities, schedules, supervisorId, assessorId });
        } else {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Fetch availabilities and finalized schedules for the participant
        const filterField = role === 'student' ? 'student_id' : role === 'supervisor' ? 'supervisor_id' : 'assessor_id';
        const availabilities = participantId
            ? await prisma.viva_availabilities.findMany({ where: { [filterField]: participantId } })
            : [];
        const schedules = participantId
            ? await prisma.viva_schedules.findMany({
                where: { [filterField]: participantId, status: 'FINALIZED' },
                include: { viva_periods: true, students: true, supervisors: true, assessors: true }
              })
            : [];

        res.status(200).json({ periods, availabilities, schedules, participantId });
    } catch (error) {
        console.error('Get My Periods Error:', error);
        res.status(500).json({ error: 'Failed to fetch periods', details: error.message });
    }
};

// ======================================================
// PARTICIPANT - GET MY DASHBOARD (legacy, kept for compat)
// ======================================================
exports.getMyDashboard = async (req, res) => {
    res.status(410).json({ error: 'This endpoint is deprecated. Use GET /api/viva/my-periods with x-user-role and x-user-email headers.' });
};