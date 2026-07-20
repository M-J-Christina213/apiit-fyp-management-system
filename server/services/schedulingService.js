const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const microsoftGraphService = require("./microsoftGraphService");

exports.generateSchedules = async (periodId) => {
    // 1. Get the Viva Period
    const period = await prisma.viva_periods.findUnique({
        where: { id: parseInt(periodId) }
    });
    
    if (!period) throw new Error("Viva period not found");

    // 2. Get all students that need scheduling (from student_fyp_records)
    const records = await prisma.student_fyp_records.findMany({
        where: { supervisor_id: { not: null }, assessor_id: { not: null } },
        include: { students: true, supervisors: true, assessors: true }
    });

    const generatedSchedules = [];

    // 3. For each student record, find a suitable slot
    for (const record of records) {
        // Fetch availabilities
        const supervisorAvails = await prisma.viva_availabilities.findMany({
            where: { supervisor_id: record.supervisor_id, date: { gte: period.viva_start, lte: period.viva_end } }
        });
        
        const assessorAvails = await prisma.viva_availabilities.findMany({
            where: { assessor_id: record.assessor_id, date: { gte: period.viva_start, lte: period.viva_end } }
        });
        
        const studentAvails = await prisma.viva_availabilities.findMany({
            where: { student_id: record.student_id, date: { gte: period.viva_start, lte: period.viva_end } }
        });

        // 4. Find matching slots (simplified logic for overlap matching)
        // Here we just pick the first supervisor slot and check if assessor is free
        let matchedSlot = null;
        for (const supAvail of supervisorAvails) {
            const overlap = assessorAvails.find(a => 
                a.date.getTime() === supAvail.date.getTime() && 
                ((a.start_time <= supAvail.start_time && a.end_time > supAvail.start_time) || 
                 (a.start_time >= supAvail.start_time && a.start_time < supAvail.end_time))
            );
            
            if (overlap) {
                // Check Outlook
                const isSupFree = await microsoftGraphService.checkCalendarAvailability(record.supervisors.email, supAvail.start_time, supAvail.end_time);
                const isAssessorFree = await microsoftGraphService.checkCalendarAvailability(record.assessors.email, supAvail.start_time, supAvail.end_time);
                
                if (isSupFree && isAssessorFree) {
                    matchedSlot = {
                        date: supAvail.date,
                        start_time: supAvail.start_time, // In real world, intersection of both
                        end_time: new Date(supAvail.start_time.getTime() + 60*60*1000) // 1 hour duration
                    };
                    break;
                }
            }
        }
        
        if (matchedSlot) {
            // 5. Create Calendar Event and Teams Link
            const eventDetails = await microsoftGraphService.createCalendarEvent(
                [record.supervisors.email, record.assessors.email, "admin@apiit.edu.my"], // add student email if available
                `Viva - ${record.students.student_name}`,
                matchedSlot.start_time,
                matchedSlot.end_time
            );
            
            // 6. Save Schedule
            const schedule = await prisma.viva_schedules.create({
                data: {
                    viva_period_id: period.id,
                    student_id: record.student_id,
                    supervisor_id: record.supervisor_id,
                    assessor_id: record.assessor_id,
                    date: matchedSlot.date,
                    start_time: matchedSlot.start_time,
                    end_time: matchedSlot.end_time,
                    mode: "Online",
                    teams_link: eventDetails?.joinUrl || null,
                    outlook_event_id: eventDetails?.id || null,
                    status: "Scheduled"
                }
            });
            generatedSchedules.push(schedule);
        }
    }
    
    return generatedSchedules;
};
