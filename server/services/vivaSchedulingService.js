const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const outlookService = require("./mockOutlookService");

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
        
        // Get the duration from the period
        const durationMins = period.duration_mins || 30;
        const durationMs = durationMins * 60 * 1000;

        // Helper function to split an availability into discrete slots
        const getDiscreteSlots = (availability) => {
            const slots = [];
            let currentStart = new Date(availability.date);
            // Combine date and time correctly for calculation
            currentStart.setHours(availability.start_time.getHours(), availability.start_time.getMinutes(), 0, 0);
            
            const endLimit = new Date(availability.date);
            endLimit.setHours(availability.end_time.getHours(), availability.end_time.getMinutes(), 0, 0);

            while (currentStart.getTime() + durationMs <= endLimit.getTime()) {
                const slotEnd = new Date(currentStart.getTime() + durationMs);
                slots.push({
                    start: new Date(currentStart),
                    end: new Date(slotEnd)
                });
                currentStart = new Date(currentStart.getTime() + durationMs);
            }
            return slots;
        };

        // Helper function to check if a target interval exists entirely within a parent availability array
        const hasSlotInAvailability = (availabilities, targetStart, targetEnd) => {
            return availabilities.some(a => {
                const aStart = new Date(a.date);
                aStart.setHours(a.start_time.getHours(), a.start_time.getMinutes(), 0, 0);
                const aEnd = new Date(a.date);
                aEnd.setHours(a.end_time.getHours(), a.end_time.getMinutes(), 0, 0);
                return aStart.getTime() <= targetStart.getTime() && aEnd.getTime() >= targetEnd.getTime();
            });
        };

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
                const supSlots = getDiscreteSlots(supAvail);

                for (const slot of supSlots) {
                    const slotKey = `${supAvail.date.toISOString()}_${slot.start.toISOString()}_${slot.end.toISOString()}`;
                    
                    // Check if this supervisor is already locally booked in this run
                    if (localAssignedSlots.has(`sup_${supervisor.id}_${slotKey}`)) continue;
                    
                    // Check assessor overlap and double-booking
                    let assessorOverlap = true;
                    if (assessor) {
                        if (assessor.viva_availabilities.length === 0) continue; // Assessor must submit if assigned
                        
                        if (localAssignedSlots.has(`assessor_${assessor.id}_${slotKey}`)) {
                            assessorOverlap = false;
                        } else {
                            assessorOverlap = hasSlotInAvailability(assessor.viva_availabilities, slot.start, slot.end);
                        }
                    }

                    if (!assessorOverlap) continue;

                    // Check student overlap
                    const studentOverlap = hasSlotInAvailability(studentAvails, slot.start, slot.end);

                    if (studentOverlap) {
                        // Check DB for existing schedules to prevent double booking globally
                        // Two schedules conflict when: existing_start < new_end AND new_start < existing_end
                        const globalConflicts = await prisma.viva_schedules.findMany({
                            where: {
                                viva_period_id: period.id,
                                OR: [
                                    { supervisor_id: supervisor.id },
                                    { assessor_id: assessor ? assessor.id : undefined }
                                ]
                            }
                        });

                        let hasGlobalConflict = false;
                        for (const gConflict of globalConflicts) {
                            if (!gConflict.start_time || !gConflict.end_time) continue;
                            const existingStart = new Date(gConflict.date);
                            existingStart.setHours(gConflict.start_time.getHours(), gConflict.start_time.getMinutes(), 0, 0);
                            const existingEnd = new Date(gConflict.date);
                            existingEnd.setHours(gConflict.end_time.getHours(), gConflict.end_time.getMinutes(), 0, 0);
                            
                            if (existingStart.getTime() < slot.end.getTime() && slot.start.getTime() < existingEnd.getTime()) {
                                hasGlobalConflict = true;
                                break;
                            }
                        }

                        if (hasGlobalConflict) continue;

                        // 3. Outlook Calendar Conflict Validation (Mocked)
                        const isSupFree = await outlookService.checkCalendarAvailability(supervisor.email, supAvail.date, slot.start, slot.end);
                        let isAssessorFree = true;
                        if (assessor) {
                            isAssessorFree = await outlookService.checkCalendarAvailability(assessor.email, supAvail.date, slot.start, slot.end);
                        }
                        
                        let isStudentFree = await outlookService.checkCalendarAvailability(student.email, supAvail.date, slot.start, slot.end);

                        if (isSupFree && isAssessorFree && isStudentFree) {
                            assignedSlot = {
                                date: supAvail.date,
                                start_time: slot.start,
                                end_time: slot.end
                            };
                            localAssignedSlots.add(`sup_${supervisor.id}_${slotKey}`);
                            if (assessor) localAssignedSlots.add(`assessor_${assessor.id}_${slotKey}`);
                            break;
                        }
                    }
                }
                if (assignedSlot) break;
            }

            if (assignedSlot) {
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
                        duration_mins: durationMins,
                        mode: "Online", // Default, can be changed during review
                        venue: "Online",
                        status: "AUTO_SCHEDULED"
                    }
                });

                createdSchedules.push(newSchedule);
            } else {
                // No common availability exists for this student
                console.warn(`No common availability for student ${student.cb_no} (${student.id})`);
                
                // Create a schedule record marking manual action required
                const manualSchedule = await prisma.viva_schedules.create({
                    data: {
                        viva_period_id: period.id,
                        student_id: student.id,
                        supervisor_id: supervisor.id,
                        assessor_id: assessor ? assessor.id : null,
                        status: "MANUAL_REQUIRED"
                    }
                });
                createdSchedules.push(manualSchedule);
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
