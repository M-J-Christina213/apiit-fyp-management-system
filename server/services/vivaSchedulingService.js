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

        // Keep track of locally assigned slots during this run to prevent double-booking
        const localAssignedSlots = new Set();

        // 2. Iterate and match (Prioritize Earliest Slot)
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
            
            const studentAvails = student.viva_availabilities || [];
            
            if (studentAvails.length === 0) continue; // Student must submit availability

            // Find common overlapping slots
            let assignedSlot = null;

            // Sort supervisor availabilities by date and time (earliest first)
            const sortedSupAvails = [...supervisor.viva_availabilities].sort((a, b) => {
                if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
                return a.start_time.getTime() - b.start_time.getTime();
            });

            for (const supAvail of sortedSupAvails) {
                const slotKey = `${supAvail.date.toISOString()}_${supAvail.start_time.toISOString()}_${supAvail.end_time.toISOString()}`;
                
                // Check if this supervisor is already locally booked in this run
                if (localAssignedSlots.has(`sup_${supervisor.id}_${slotKey}`)) continue;
                
                // Check assessor overlap and double-booking
                let assessorOverlap = true;
                if (assessor) {
                    if (assessor.viva_availabilities.length === 0) continue; // Assessor must submit if assigned
                    
                    if (localAssignedSlots.has(`assessor_${assessor.id}_${slotKey}`)) {
                        assessorOverlap = false;
                    } else {
                        assessorOverlap = assessor.viva_availabilities.some(a => 
                            a.date.getTime() === supAvail.date.getTime() &&
                            a.start_time.getTime() <= supAvail.start_time.getTime() &&
                            a.end_time.getTime() >= supAvail.end_time.getTime()
                        );
                    }
                }

                if (!assessorOverlap) continue;

                // Check student overlap
                const studentOverlap = studentAvails.some(a => 
                    a.date.getTime() === supAvail.date.getTime() &&
                    a.start_time.getTime() <= supAvail.start_time.getTime() &&
                    a.end_time.getTime() >= supAvail.end_time.getTime()
                );

                if (studentOverlap) {
                    // Check DB for existing schedules to prevent double booking globally
                    const globalConflict = await prisma.viva_schedules.findFirst({
                        where: {
                            viva_period_id: period.id,
                            date: supAvail.date,
                            start_time: supAvail.start_time,
                            end_time: supAvail.end_time,
                            OR: [
                                { supervisor_id: supervisor.id },
                                { assessor_id: assessor ? assessor.id : undefined }
                            ]
                        }
                    });

                    if (globalConflict) continue;

                    // 3. Outlook Calendar Conflict Validation
                    const isSupFree = await graphService.checkCalendarAvailability(supervisor.email, supAvail.date, supAvail.start_time, supAvail.end_time);
                    let isAssessorFree = true;
                    if (assessor) {
                        isAssessorFree = await graphService.checkCalendarAvailability(assessor.email, supAvail.date, supAvail.start_time, supAvail.end_time);
                    }
                    
                    let isStudentFree = await graphService.checkCalendarAvailability(student.email, supAvail.date, supAvail.start_time, supAvail.end_time);

                    if (isSupFree && isAssessorFree && isStudentFree) {
                        assignedSlot = supAvail;
                        localAssignedSlots.add(`sup_${supervisor.id}_${slotKey}`);
                        if (assessor) localAssignedSlots.add(`assessor_${assessor.id}_${slotKey}`);
                        break;
                    }
                }
            }

            if (assignedSlot) {
                // 4. Create the event on MS Graph (tentative online)
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
                        status: "Pending Admin Confirmation"
                    }
                });

                createdSchedules.push(newSchedule);
            } else {
                // Log that no common availability exists for this student
                console.warn(`No common availability for student ${student.cb_no} (${student.id})`);
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
