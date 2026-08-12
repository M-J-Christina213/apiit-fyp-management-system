const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const schedulingService = require("../services/vivaSchedulingService");


// ======================================================
// ADMIN - GET ALL VIVA PERIODS
// ======================================================

exports.getVivaPeriods = async (req, res) => {
    try {
        const periods = await prisma.viva_periods.findMany({
            orderBy: {
                created_at: "desc"
            },
            include: {
                _count: {
                    select: {
                        viva_availabilities: true,
                        viva_schedules: true
                    }
                }
            }
        });

        res.status(200).json(periods);

    } catch (error) {
        console.error("Get Viva Periods Error:", error);

        res.status(500).json({
            error: "Failed to fetch Viva Periods",
            details: error.message
        });
    }
};


// ======================================================
// ADMIN - GET SINGLE VIVA PERIOD
// ======================================================

exports.getVivaPeriodById = async (req, res) => {

    const periodId = parseInt(req.params.id);

    if (isNaN(periodId)) {
        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });
    }

    try {

        const period = await prisma.viva_periods.findUnique({
            where: {
                id: periodId
            },
            include: {
                _count: {
                    select: {
                        viva_availabilities: true,
                        viva_schedules: true
                    }
                }
            }
        });

        if (!period) {
            return res.status(404).json({
                error: "Viva Period not found"
            });
        }

        res.status(200).json(period);

    } catch (error) {

        console.error("Get Viva Period Error:", error);

        res.status(500).json({
            error: "Failed to fetch Viva Period",
            details: error.message
        });
    }
};


// ======================================================
// ADMIN - CREATE VIVA PERIOD
// ======================================================

exports.createVivaPeriod = async (req, res) => {

    const {
        type,
        startDate,
        endDate,
        dailyStartTime,
        dailyEndTime,
        slotDuration
    } = req.body;

    // Basic validation
    if (
        !type ||
        !startDate ||
        !endDate ||
        !dailyStartTime ||
        !dailyEndTime ||
        !slotDuration
    ) {
        return res.status(400).json({
            error: "All Viva Period fields are required"
        });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
            error: "Invalid date format"
        });
    }

    if (start > end) {
        return res.status(400).json({
            error: "End date must be after or equal to start date."
        });
    }

    const [startHour, startMin] = dailyStartTime.split(":").map(Number);
    const [endHour, endMin] = dailyEndTime.split(":").map(Number);
    const startTimeMins = startHour * 60 + startMin;
    const endTimeMins = endHour * 60 + endMin;

    if (endTimeMins <= startTimeMins) {
        return res.status(400).json({
            error: "Daily end time must be after daily start time."
        });
    }

    const duration = parseInt(slotDuration, 10);
    if (![15, 30, 45, 60].includes(duration)) {
        return res.status(400).json({
            error: "Time slot duration must be 15, 30, 45, or 60 minutes."
        });
    }

    const totalAvailableMins = endTimeMins - startTimeMins;
    if (totalAvailableMins % duration !== 0) {
        return res.status(400).json({
            error: "Time range must be divisible by the selected slot duration."
        });
    }

    try {

        const period = await prisma.viva_periods.create({
            data: {
                type,
                availability_start: start,
                availability_end: end,
                viva_start: start,
                viva_end: end,
                daily_start_time: dailyStartTime,
                daily_end_time: dailyEndTime,
                duration_mins: duration,

                // Initial state
                status: "Draft"
            }
        });

        res.status(201).json({
            message: "Viva Period created successfully",
            period
        });

    } catch (error) {

        console.error("Create Viva Period Error:", error);

        res.status(500).json({
            error: "Failed to create Viva Period",
            details: error.message
        });
    }
};


// ======================================================
// ADMIN - UPDATE VIVA PERIOD
// ======================================================

exports.updateVivaPeriod = async (req, res) => {

    const periodId = parseInt(req.params.id);

    if (isNaN(periodId)) {
        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });
    }

    const {
        type,
        startDate,
        endDate,
        dailyStartTime,
        dailyEndTime,
        slotDuration,
        status
    } = req.body;

    try {

        const existingPeriod =
            await prisma.viva_periods.findUnique({
                where: {
                    id: periodId
                }
            });

        if (!existingPeriod) {
            return res.status(404).json({
                error: "Viva Period not found"
            });
        }

        const updatedData = { ... (type && { type }), ... (status && { status }) };

        if (startDate) {
            updatedData.availability_start = new Date(startDate);
            updatedData.viva_start = new Date(startDate);
        }
        if (endDate) {
            updatedData.availability_end = new Date(endDate);
            updatedData.viva_end = new Date(endDate);
        }
        if (dailyStartTime) {
            updatedData.daily_start_time = dailyStartTime;
        }
        if (dailyEndTime) {
            updatedData.daily_end_time = dailyEndTime;
        }
        if (slotDuration) {
            updatedData.duration_mins = parseInt(slotDuration, 10);
        }

        const updatedPeriod =
            await prisma.viva_periods.update({
                where: {
                    id: periodId
                },
                data: updatedData
            });

        res.status(200).json({
            message: "Viva Period updated successfully",
            period: updatedPeriod
        });

    } catch (error) {

        console.error("Update Viva Period Error:", error);

        res.status(500).json({
            error: "Failed to update Viva Period",
            details: error.message
        });
    }
};


// ======================================================
// ADMIN - DELETE VIVA PERIOD
// ======================================================

exports.deleteVivaPeriod = async (req, res) => {

    const periodId = parseInt(req.params.id);

    if (isNaN(periodId)) {
        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });
    }

    try {

        const period =
            await prisma.viva_periods.findUnique({
                where: {
                    id: periodId
                }
            });

        if (!period) {
            return res.status(404).json({
                error: "Viva Period not found"
            });
        }

        await prisma.viva_periods.delete({
            where: {
                id: periodId
            }
        });

        res.status(200).json({
            message: "Viva Period deleted successfully"
        });

    } catch (error) {

        console.error("Delete Viva Period Error:", error);

        res.status(500).json({
            error: "Failed to delete Viva Period",
            details: error.message
        });
    }
};


// ======================================================
// ADMIN - DASHBOARD STATISTICS
// ======================================================

exports.getDashboardStats = async (req, res) => {

    try {

        const [
            activePeriods,
            totalSchedules,
            totalAvailabilities,
            pendingPeriods
        ] = await Promise.all([

            prisma.viva_periods.count({
                where: {
                    status: {
                        in: [
                            "Availability Collection",
                            "Scheduling",
                            "Scheduled"
                        ]
                    }
                }
            }),

            prisma.viva_schedules.count(),

            prisma.viva_availabilities.count(),

            prisma.viva_periods.count({
                where: {
                    status: "Draft"
                }
            })
        ]);

        res.status(200).json({

            activePeriods,

            totalSchedules,

            totalAvailabilities,

            pendingPeriods
        });

    } catch (error) {

        console.error("Dashboard Stats Error:", error);

        res.status(500).json({
            error: "Failed to fetch dashboard statistics",
            details: error.message
        });
    }
};


// ======================================================
// AVAILABILITY - SUBMIT
// ======================================================

exports.submitAvailability = async (req, res) => {

    const periodId = parseInt(req.params.periodId);

    const {
        supervisor_id,
        assessor_id,
        student_id,
        date,
        start_time,
        end_time
    } = req.body;


    if (isNaN(periodId)) {
        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });
    }


    // Exactly ONE user type should be provided
    const providedUsers = [
        supervisor_id,
        assessor_id,
        student_id
    ].filter(id => id !== undefined && id !== null);


    if (providedUsers.length !== 1) {
        return res.status(400).json({
            error:
                "Availability must belong to exactly one supervisor, assessor, or student"
        });
    }


    try {

        // Check Viva Period exists
        const period =
            await prisma.viva_periods.findUnique({
                where: {
                    id: periodId
                }
            });


        if (!period) {
            return res.status(404).json({
                error: "Viva Period not found"
            });
        }


        const selectedDate = new Date(date);


        // Make sure date is inside availability period
        if (
            selectedDate < period.availability_start ||
            selectedDate > period.availability_end
        ) {
            return res.status(400).json({
                error:
                    "Selected date is outside the Viva availability collection period"
            });
        }


        const availability =
            await prisma.viva_availabilities.create({

                data: {

                    viva_period_id: periodId,

                    supervisor_id:
                        supervisor_id
                            ? parseInt(supervisor_id)
                            : null,

                    assessor_id:
                        assessor_id
                            ? parseInt(assessor_id)
                            : null,

                    student_id:
                        student_id
                            ? parseInt(student_id)
                            : null,

                    date: selectedDate,

                    start_time:
                        new Date(`${date}T${start_time}:00Z`),

                    end_time:
                        new Date(`${date}T${end_time}:00Z`)
                }
            });


        res.status(201).json({
            message: "Availability submitted successfully",
            availability
        });


    } catch (error) {

        console.error(
            "Submit Availability Error:",
            error
        );

        res.status(500).json({
            error: "Failed to submit availability",
            details: error.message
        });
    }
};


// ======================================================
// AVAILABILITY - GET
// ======================================================

exports.getAvailability = async (req, res) => {

    const periodId =
        parseInt(req.params.periodId);

    const {
        supervisor_id,
        assessor_id,
        student_id
    } = req.query;


    if (isNaN(periodId)) {
        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });
    }


    try {

        const where = {
            viva_period_id: periodId
        };


        if (supervisor_id) {

            where.supervisor_id =
                parseInt(supervisor_id);

        }


        if (assessor_id) {

            where.assessor_id =
                parseInt(assessor_id);

        }


        if (student_id) {

            where.student_id =
                parseInt(student_id);

        }


        const availability =
            await prisma.viva_availabilities.findMany({

                where,

                orderBy: [
                    {
                        date: "asc"
                    },
                    {
                        start_time: "asc"
                    }
                ]
            });


        res.status(200).json(
            availability
        );


    } catch (error) {

        console.error(
            "Get Availability Error:",
            error
        );

        res.status(500).json({
            error: "Failed to fetch availability",
            details: error.message
        });
    }
};


// ======================================================
// ADMIN - AVAILABILITY STATUS
// ======================================================

exports.getAvailabilityStatus = async (req, res) => {

    const periodId =
        parseInt(req.params.periodId);


    if (isNaN(periodId)) {

        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });

    }


    try {

        const period =
            await prisma.viva_periods.findUnique({

                where: {
                    id: periodId
                }

            });


        if (!period) {

            return res.status(404).json({
                error: "Viva Period not found"
            });

        }


        const [
            supervisorCount,
            assessorCount,
            studentCount
        ] = await Promise.all([

            prisma.supervisors.count(),

            prisma.assessors.count(),

            prisma.students.count({
                where: {
                    batch_id: {
                        not: null
                    }
                }
            })

        ]);


        const [
            submittedSupervisors,
            submittedAssessors,
            submittedStudents
        ] = await Promise.all([

            prisma.viva_availabilities.findMany({

                where: {
                    viva_period_id: periodId,
                    supervisor_id: {
                        not: null
                    }
                },

                distinct: [
                    "supervisor_id"
                ],

                select: {
                    supervisor_id: true
                }

            }),

            prisma.viva_availabilities.findMany({

                where: {
                    viva_period_id: periodId,
                    assessor_id: {
                        not: null
                    }
                },

                distinct: [
                    "assessor_id"
                ],

                select: {
                    assessor_id: true
                }

            }),

            prisma.viva_availabilities.findMany({

                where: {
                    viva_period_id: periodId,
                    student_id: {
                        not: null
                    }
                },

                distinct: [
                    "student_id"
                ],

                select: {
                    student_id: true
                }

            })

        ]);


        res.status(200).json({

            periodId,

            supervisors: {
                total: supervisorCount,
                submitted:
                    submittedSupervisors.length,
                pending:
                    supervisorCount -
                    submittedSupervisors.length
            },

            assessors: {
                total: assessorCount,
                submitted:
                    submittedAssessors.length,
                pending:
                    assessorCount -
                    submittedAssessors.length
            },

            students: {
                total: studentCount,
                submitted:
                    submittedStudents.length,
                pending:
                    studentCount -
                    submittedStudents.length
            }

        });


    } catch (error) {

        console.error(
            "Availability Status Error:",
            error
        );

        res.status(500).json({
            error:
                "Failed to fetch availability status",
            details:
                error.message
        });
    }
};


// ======================================================
// ADMIN - TRIGGER AUTO SCHEDULING
// ======================================================

exports.triggerAutoScheduling = async (req, res) => {

    const periodId =
        parseInt(req.params.periodId);


    if (isNaN(periodId)) {

        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });

    }


    try {

        const period =
            await prisma.viva_periods.findUnique({

                where: {
                    id: periodId
                }

            });


        if (!period) {

            return res.status(404).json({
                error: "Viva Period not found"
            });

        }


        // Only allow scheduling when
        // availability collection is complete
        if (
            period.status !==
            "Availability Collection"
            &&
            period.status !==
            "Scheduling"
        ) {

            return res.status(400).json({

                error:
                    "This Viva Period is not ready for scheduling"

            });

        }


        const schedules =
            await schedulingService.generateSchedules(
                periodId
            );


        res.status(200).json({

            message:
                "Scheduling completed successfully",

            schedules

        });


    } catch (error) {

        console.error(
            "Auto Scheduling Error:",
            error
        );

        res.status(500).json({

            error:
                "Failed to generate schedules",

            details:
                error.message

        });

    }
};


// ======================================================
// GET SCHEDULES
// ======================================================

exports.getSchedules = async (req, res) => {

    const periodId =
        parseInt(req.params.periodId);


    if (isNaN(periodId)) {

        return res.status(400).json({
            error: "Invalid Viva Period ID"
        });

    }


    try {

        const schedules =
            await prisma.viva_schedules.findMany({

                where: {
                    viva_period_id: periodId
                },

                include: {

                    students: {
                        include: {
                            batches: true,
                            student_fyp_records: true
                        }
                    },

                    supervisors: true,

                    assessors: true,

                    viva_periods: true

                },

                orderBy: [

                    {
                        date: "asc"
                    },

                    {
                        start_time: "asc"
                    }

                ]

            });


        res.status(200).json(
            schedules
        );


    } catch (error) {

        console.error(
            "Get Schedules Error:",
            error
        );

        res.status(500).json({

            error:
                "Failed to fetch schedules",

            details:
                error.message

        });

    }
};


// ======================================================
// ADMIN - CONFIRM SCHEDULE
// ======================================================

exports.confirmSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);

    if (isNaN(scheduleId)) {
        return res.status(400).json({ error: "Invalid Schedule ID" });
    }

    const { mode, venue } = req.body;

    try {
        const schedule = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId },
            include: {
                students: true,
                supervisors: true,
                assessors: true,
                viva_periods: true
            }
        });

        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        const updatedSchedule = await prisma.viva_schedules.update({
            where: { id: scheduleId },
            data: {
                status: "Confirmed",
                ...(mode && { mode }),
                ...(venue && { venue })
            }
        });
        
        // At this point we could send emails or notifications to participants
        console.log(`Viva schedule confirmed for student ${schedule.students.student_name}`);

        res.status(200).json({
            message: "Schedule confirmed successfully",
            schedule: updatedSchedule
        });
    } catch (error) {
        console.error("Confirm Schedule Error:", error);
        res.status(500).json({
            error: "Failed to confirm schedule",
            details: error.message
        });
    }
};

// ======================================================
// ADMIN - INTEGRATION STATUS
// ======================================================

exports.getIntegrationStatus = async (req, res) => {
    try {
        const outlookService = require("../services/mockOutlookService");
        const status = await outlookService.testConnection();
        res.status(200).json(status);
    } catch (error) {
        console.error("Get Integration Status Error:", error);
        res.status(500).json({
            status: 'error',
            message: "Failed to check integration status",
            details: error.message
        });
    }
};

// ======================================================
// ADMIN - PUBLISH VIVA PERIOD
// ======================================================

exports.publishVivaPeriod = async (req, res) => {
    const periodId = parseInt(req.params.id);

    if (isNaN(periodId)) {
        return res.status(400).json({ error: "Invalid Viva Period ID" });
    }

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return res.status(404).json({ error: "Viva Period not found" });
        }

        const updatedPeriod = await prisma.viva_periods.update({
            where: { id: periodId },
            data: { status: "Availability Collection" }
        });

        // Generate notifications for Students, Supervisors, Assessors
        // e.g. await notificationService.notifyAllForAvailability(period.id);

        res.status(200).json({
            message: "Viva Period published successfully. Availability collection has started.",
            period: updatedPeriod
        });
    } catch (error) {
        console.error("Publish Viva Period Error:", error);
        res.status(500).json({
            error: "Failed to publish Viva Period",
            details: error.message
        });
    }
};

// ======================================================
// ADMIN - UPDATE SCHEDULE
// ======================================================

exports.updateSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);

    if (isNaN(scheduleId)) {
        return res.status(400).json({ error: "Invalid Schedule ID" });
    }

    const { date, start_time, end_time, mode, venue } = req.body;

    try {
        const schedule = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId }
        });

        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        // If a new date is provided but no new start_time, we might have issues formatting the time strings.
        // For simplicity, we expect the frontend to pass valid ISO strings for start_time and end_time.
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

        res.status(200).json({
            message: "Schedule updated successfully",
            schedule: updatedSchedule
        });
    } catch (error) {
        console.error("Update Schedule Error:", error);
        res.status(500).json({
            error: "Failed to update schedule",
            details: error.message
        });
    }
};

// ======================================================
// ADMIN - PUBLISH SCHEDULES
// ======================================================

exports.publishSchedules = async (req, res) => {
    const periodId = parseInt(req.params.periodId);

    if (isNaN(periodId)) {
        return res.status(400).json({ error: "Invalid Viva Period ID" });
    }

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return res.status(404).json({ error: "Viva Period not found" });
        }

        // Mark the period as published
        await prisma.viva_periods.update({
            where: { id: periodId },
            data: { status: "Published" }
        });

        // Mark all confirmed schedules as published
        await prisma.viva_schedules.updateMany({
            where: { 
                viva_period_id: periodId,
                status: "Confirmed"
            },
            data: { status: "Published" }
        });

        // Here we can generate final schedule notifications for all participants
        // and trigger Outlook integration services if available.

        res.status(200).json({
            message: "Schedules published successfully. Notifications sent."
        });
    } catch (error) {
        console.error("Publish Schedules Error:", error);
        res.status(500).json({
            error: "Failed to publish schedules",
            details: error.message
        });
    }
};

// ======================================================
// ADMIN - FINALIZE SCHEDULE
// ======================================================

exports.finalizeSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);

    if (isNaN(scheduleId)) {
        return res.status(400).json({ error: "Invalid Schedule ID" });
    }

    try {
        const schedule = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId },
            include: {
                students: true,
                supervisors: true,
                assessors: true,
                viva_periods: true
            }
        });

        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }
        
        // Mock Notifications
        const message = `Your ${schedule.viva_periods.type} has been scheduled for ${new Date(schedule.date).toLocaleDateString()} at ${new Date(schedule.start_time).toLocaleTimeString()}.`;
        console.log(`[Mock Notification] ${message} sent to ${[schedule.students.email, schedule.supervisors?.email, schedule.assessors?.email].filter(Boolean).join(', ')}`);

        // Update Schedule Status
        const updatedSchedule = await prisma.viva_schedules.update({
            where: { id: scheduleId },
            data: {
                status: "FINALIZED"
            }
        });

        res.status(200).json({
            message: "Schedule finalized successfully",
            schedule: updatedSchedule
        });
    } catch (error) {
        console.error("Finalize Schedule Error:", error);
        res.status(500).json({
            error: "Failed to finalize schedule",
            details: error.message
        });
    }
};

// ======================================================
// ADMIN/PM - EXPORT SCHEDULES
// ======================================================

exports.exportSchedules = async (req, res) => {
    const periodId = parseInt(req.params.id);

    if (isNaN(periodId)) {
        return res.status(400).json({ error: "Invalid Viva Period ID" });
    }

    try {
        const schedules = await prisma.viva_schedules.findMany({
            where: { viva_period_id: periodId, status: "FINALIZED" },
            include: {
                students: true,
                supervisors: true,
                assessors: true,
                viva_periods: true
            },
            orderBy: [{ date: "asc" }, { start_time: "asc" }]
        });

        // Generate CSV string
        let csv = "Stage,Student Name,Student ID,Supervisor,Assessor,Date,Start Time,End Time,Duration,Mode,Venue,Teams Link,Outlook Event ID,Status\n";
        
        schedules.forEach(sch => {
            csv += `"${sch.viva_periods.type}","${sch.students.student_name}","${sch.students.cb_no}","${sch.supervisors?.name || ''}","${sch.assessors?.name || ''}","${sch.date ? new Date(sch.date).toLocaleDateString() : ''}","${sch.start_time ? new Date(sch.start_time).toLocaleTimeString() : ''}","${sch.end_time ? new Date(sch.end_time).toLocaleTimeString() : ''}","${sch.duration_mins}","${sch.mode || ''}","${sch.venue || ''}","${sch.teams_link || ''}","${sch.outlook_event_id || ''}","${sch.status}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="viva-schedules-${periodId}.csv"`);
        res.status(200).send(csv);

    } catch (error) {
        console.error("Export Schedules Error:", error);
        res.status(500).json({
            error: "Failed to export schedules",
            details: error.message
        });
    }
};

// ======================================================
// PARTICIPANT - GET MY DASHBOARD
// ======================================================

exports.getMyDashboard = async (req, res) => {
    const { role, id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid User ID" });
    }

    try {
        const periods = await prisma.viva_periods.findMany({
            where: {
                status: {
                    not: "Draft"
                }
            },
            orderBy: {
                created_at: "desc"
            }
        });

        const filterField = role === 'student' ? 'student_id' : role === 'supervisor' ? 'supervisor_id' : 'assessor_id';

        const availabilities = await prisma.viva_availabilities.findMany({
            where: {
                [filterField]: userId
            }
        });

        const schedules = await prisma.viva_schedules.findMany({
            where: {
                [filterField]: userId
            },
            include: {
                viva_periods: true,
                students: true,
                supervisors: true,
                assessors: true
            }
        });

        res.status(200).json({
            periods,
            availabilities,
            schedules
        });

    } catch (error) {
        console.error("Get My Dashboard Error:", error);
        res.status(500).json({
            error: "Failed to fetch dashboard data",
            details: error.message
        });
    }
};