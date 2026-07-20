const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const graphService = require("./graphService");

/**
 * The Automatic Scheduling Engine logic.
 * Priority: Supervisor > Assessor > Outlook Calendar Validation > Student > Earliest available
 */
async function generateSchedules(vivaPeriodId) {
    try {
        console.log(`Starting Automatic Scheduling for Viva Period: ${vivaPeriodId}`);

        const period = await prisma.viva_periods.findUnique({
            where: { id: parseInt(vivaPeriodId) }
        });

        if (!period) throw new Error("Viva Period not found");

        // 1. Fetch all students who need a viva schedule
        const students = await prisma.students.findMany({
            include: {
                viva_availabilities: true,
                student_fyp_records: {
                    include: {
                        supervisors: {
                            include: { viva_availabilities: true }
                        },
                        assessors: {
                            include: { viva_availabilities: true }
                        }
                    }
                }
            }
        });

        const createdSchedules = [];

        // 2. Iterate and match (Simplified scheduling algorithm)
        for (const student of students) {
            // Check if already scheduled
            const existingSchedule = await prisma.viva_schedules.findFirst({
                where: { viva_period_id: period.id, student_id: student.id }
            });
            if (existingSchedule) continue;

            const fypRecord = student.student_fyp_records[0];
            if (!fypRecord) continue;

            const supervisor = fypRecord.supervisors;
            const assessor = fypRecord.assessors;

            if (!supervisor) continue; // Supervisor required

            // Find common overlapping slots
            let assignedSlot = null;

            // Simple intersection logic for demonstration
            // Supervisor's availability is highest priority
            for (const supAvail of supervisor.viva_availabilities) {
                // If assessor exists, check if they overlap
                let assessorOverlap = true;
                if (assessor && assessor.viva_availabilities.length > 0) {
                    assessorOverlap = assessor.viva_availabilities.some(a => 
                        a.date.getTime() === supAvail.date.getTime() &&
                        a.start_time.getTime() <= supAvail.start_time.getTime() &&
                        a.end_time.getTime() >= supAvail.end_time.getTime()
                    );
                }

                if (assessorOverlap) {
                    // 3. Outlook Calendar Conflict Validation
                    const isSupFree = await graphService.checkCalendarAvailability(supervisor.email, supAvail.date, supAvail.start_time, supAvail.end_time);
                    let isAssessorFree = true;
                    if (assessor) {
                        isAssessorFree = await graphService.checkCalendarAvailability(assessor.email, supAvail.date, supAvail.start_time, supAvail.end_time);
                    }

                    if (isSupFree && isAssessorFree) {
                        assignedSlot = supAvail;
                        break;
                    }
                }
            }

            if (assignedSlot) {
                // 4. Create the event on MS Graph
                const eventDetails = {
                    title: `${period.type} - ${student.cb_no} - ${student.student_name}`,
                    date: assignedSlot.date,
                    startTime: assignedSlot.start_time,
                    endTime: assignedSlot.end_time,
                    participants: [student.email, supervisor.email, assessor ? assessor.email : null].filter(Boolean),
                    isOnline: true, // Default to online for teams link generation testing
                    venue: "Online"
                };

                const { eventId, teamsLink } = await graphService.createCalendarEvent(eventDetails);

                // 5. Save to DB
                const newSchedule = await prisma.viva_schedules.create({
                    data: {
                        viva_period_id: period.id,
                        student_id: student.id,
                        supervisor_id: supervisor.id,
                        assessor_id: assessor ? assessor.id : null,
                        date: assignedSlot.date,
                        start_time: assignedSlot.start_time,
                        end_time: assignedSlot.end_time,
                        mode: "Online",
                        venue: "Online",
                        teams_link: teamsLink,
                        outlook_event_id: eventId,
                        status: "Scheduled"
                    }
                });

                createdSchedules.push(newSchedule);
            }
        }

        // Update period status
        await prisma.viva_periods.update({
            where: { id: period.id },
            data: { status: "Scheduled" }
        });

        return createdSchedules;

    } catch (error) {
        console.error("Error in automatic scheduling engine:", error);
        throw error;
    }
}

module.exports = {
    generateSchedules
};
