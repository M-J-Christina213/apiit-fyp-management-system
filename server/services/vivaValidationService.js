const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class VivaValidationService {
    /**
     * Helper to parse time string (e.g. "09:30" or "09:30:00" or ISO or Excel fraction) to minutes from midnight
     */
    static timeToMinutes(timeVal) {
        if (!timeVal) return null;
        if (typeof timeVal === "number") {
            // Excel fraction of a day: e.g. 0.3958333 -> 9:30
            const totalMins = Math.round(timeVal * 24 * 60);
            return totalMins;
        }
        const str = String(timeVal).trim();
        // Check if ISO or full datetime string
        if (str.includes("T") || str.includes("Z")) {
            const d = new Date(str);
            if (!isNaN(d)) {
                return d.getUTCHours() * 60 + d.getUTCMinutes();
            }
        }
        // Match HH:mm or HH:mm:ss or H:mm am/pm
        const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const mins = parseInt(match[2], 10);
            const ampm = match[4]?.toLowerCase();
            if (ampm === "pm" && hours < 12) hours += 12;
            if (ampm === "am" && hours === 12) hours = 0;
            return hours * 60 + mins;
        }
        return null;
    }

    /**
     * Convert minutes from midnight into "HH:mm" string
     */
    static minutesToTimeString(minutes) {
        if (minutes === null || isNaN(minutes)) return "09:00";
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    /**
     * Format date to YYYY-MM-DD string
     */
    static formatDate(dateVal) {
        if (!dateVal) return null;
        if (dateVal instanceof Date && !isNaN(dateVal)) {
            return dateVal.toISOString().split("T")[0];
        }
        const str = String(dateVal).trim();
        const d = new Date(str);
        if (!isNaN(d)) {
            return d.toISOString().split("T")[0];
        }
        return null;
    }

    /**
     * Look up student by CB No or ID
     */
    static async resolveStudent({ cb_no, student_id, student_name }) {
        if (student_id) {
            const student = await prisma.students.findUnique({
                where: { id: parseInt(student_id) },
                include: { batches: true }
            });
            if (student) return student;
        }
        if (cb_no) {
            const cleanCb = String(cb_no).trim().toUpperCase();
            const student = await prisma.students.findFirst({
                where: { cb_no: { equals: cleanCb, mode: "insensitive" } },
                include: { batches: true }
            });
            if (student) return student;
        }
        if (student_name) {
            const cleanName = String(student_name).trim();
            const student = await prisma.students.findFirst({
                where: { student_name: { equals: cleanName, mode: "insensitive" } },
                include: { batches: true }
            });
            if (student) return student;
        }
        return null;
    }

    /**
     * Look up supervisor by ID, Email, or Name
     */
    static async resolveSupervisor({ supervisor_id, supervisor_email, supervisor_name }) {
        if (supervisor_id) {
            const sup = await prisma.supervisors.findUnique({
                where: { id: parseInt(supervisor_id) }
            });
            if (sup) return sup;
        }
        if (supervisor_email) {
            const cleanEmail = String(supervisor_email).trim().toLowerCase();
            const sup = await prisma.supervisors.findFirst({
                where: { email: { equals: cleanEmail, mode: "insensitive" } }
            });
            if (sup) return sup;
        }
        if (supervisor_name) {
            const cleanName = String(supervisor_name).trim();
            const sup = await prisma.supervisors.findFirst({
                where: { name: { equals: cleanName, mode: "insensitive" } }
            });
            if (sup) return sup;
        }
        return null;
    }

    /**
     * Look up assessor by ID, Email, or Name
     */
    static async resolveAssessor({ assessor_id, assessor_email, assessor_name }) {
        if (assessor_id) {
            const ass = await prisma.assessors.findUnique({
                where: { id: parseInt(assessor_id) }
            });
            if (ass) return ass;
        }
        if (assessor_email) {
            const cleanEmail = String(assessor_email).trim().toLowerCase();
            const ass = await prisma.assessors.findFirst({
                where: { email: { equals: cleanEmail, mode: "insensitive" } }
            });
            if (ass) return ass;
        }
        if (assessor_name) {
            const cleanName = String(assessor_name).trim();
            const ass = await prisma.assessors.findFirst({
                where: { name: { equals: cleanName, mode: "insensitive" } }
            });
            if (ass) return ass;
        }
        return null;
    }

    /**
     * Validate a single Viva schedule entry (used by both manual creation and Excel import)
     * 
     * @param {Object} input - Raw input from manual form or parsed Excel row
     * @param {Object} period - Viva Period object from database
     * @param {Number|null} excludeScheduleId - For update operations, exclude self from conflict checks
     * @param {Array|null} inMemorySchedules - For bulk Excel upload, check conflicts against other rows in the same file
     */
    static async validateScheduleEntry(input, period, excludeScheduleId = null, inMemorySchedules = []) {
        const errors = [];
        const warnings = [];
        const conflicts = [];

        // 1. Period verification
        if (!period) {
            errors.push("Invalid or missing Viva Period.");
            return { isValid: false, errors, warnings, conflicts, parsedData: null };
        }

        // 2. Resolve Student
        const student = await this.resolveStudent({
            cb_no: input.cb_no || input["CB No"] || input["cbNo"],
            student_id: input.student_id,
            student_name: input.student_name || input["Name"] || input["Student Name"]
        });

        if (!student) {
            const iden = input.cb_no || input["CB No"] || input.student_name || input["Name"] || "Unknown";
            errors.push(`Student not found for identifier '${iden}'.`);
        } else {
            // Check if student belongs to one of the period batches
            const periodBatchIds = period.viva_period_batches?.map(b => b.batch_id) || [];
            if (periodBatchIds.length > 0 && student.batch_id && !periodBatchIds.includes(student.batch_id)) {
                warnings.push(`Student '${student.student_name}' (${student.cb_no}) belongs to batch '${student.batches?.batch_code}', which is not configured for this Viva Period.`);
            }
        }

        // 3. Resolve Supervisor
        const supervisor = await this.resolveSupervisor({
            supervisor_id: input.supervisor_id,
            supervisor_email: input.supervisor_email || input["Supervisor Email"],
            supervisor_name: input.supervisor_name || input["Supervisor"] || input["Supervisor Name"]
        });

        if (!supervisor) {
            const iden = input.supervisor_name || input["Supervisor"] || input.supervisor_id || "Unassigned";
            errors.push(`Supervisor '${iden}' could not be found in the database.`);
        }

        // 4. Resolve Assessor
        const assessor = await this.resolveAssessor({
            assessor_id: input.assessor_id,
            assessor_email: input.assessor_email || input["Assessor Email"],
            assessor_name: input.assessor_name || input["Assessor"] || input["Assessor Name"]
        });

        if (!assessor) {
            const iden = input.assessor_name || input["Assessor"] || input.assessor_id || "Unassigned";
            errors.push(`Assessor '${iden}' could not be found in the database.`);
        }

        // 5. Date Validation
        const rawDate = input.date || input.proposed_date || input["Proposed Date"] || input["Date"];
        const formattedDate = this.formatDate(rawDate);
        if (!formattedDate) {
            errors.push(`Invalid or missing proposed date: '${rawDate}'. Expected YYYY-MM-DD.`);
        } else {
            const d = new Date(formattedDate);
            const periodStart = new Date(period.start_date);
            const periodEnd = new Date(period.end_date);
            if (d < periodStart || d > periodEnd) {
                warnings.push(`Proposed date ${formattedDate} is outside the Viva Period range (${period.start_date.toISOString().split("T")[0]} to ${period.end_date.toISOString().split("T")[0]}).`);
            }
        }

        // 6. Time Validation
        const rawTime = input.time || input.start_time || input.proposed_time || input["Time"] || input["Proposed Time"];
        const startMins = this.timeToMinutes(rawTime);
        if (startMins === null) {
            errors.push(`Invalid or missing proposed time: '${rawTime}'. Expected HH:mm.`);
        }

        const duration = parseInt(input.duration_mins || period.slot_duration || 30, 10);
        const endMins = startMins !== null ? startMins + duration : null;

        // Daily time window check
        if (startMins !== null && period.daily_start_time && period.daily_end_time) {
            const periodDailyStart = this.timeToMinutes(period.daily_start_time);
            const periodDailyEnd = this.timeToMinutes(period.daily_end_time);
            if (periodDailyStart !== null && periodDailyEnd !== null) {
                if (startMins < periodDailyStart || endMins > periodDailyEnd) {
                    warnings.push(`Time slot ${this.minutesToTimeString(startMins)} - ${this.minutesToTimeString(endMins)} falls outside the daily viva window (${period.daily_start_time} - ${period.daily_end_time}).`);
                }
            }
        }

        // 7. Attendance Mode & Venue
        let rawMode = (input.attendance_mode || input.mode || input["Attendance Mode"] || input["Mode"] || "PHYSICAL").toUpperCase().trim();
        if (!["PHYSICAL", "ONLINE", "HYBRID"].includes(rawMode)) {
            rawMode = "PHYSICAL";
        }

        let venue = (input.venue || input["Venue"] || "").trim();
        if (!venue) {
            venue = rawMode === "ONLINE" ? "Microsoft Teams" : "TBA";
        }
        if (rawMode === "ONLINE" && (!input.teams_link && !input.teams_join_url && !input["Teams Link"])) {
            warnings.push("Attendance mode is Online, but Microsoft Teams link is not yet assigned.");
        }

        // 8. Duplicate Student Check in this Viva Period
        if (student) {
            const existingStudentSchedule = await prisma.viva_schedules.findFirst({
                where: {
                    viva_period_id: period.id,
                    student_id: student.id,
                    ...(excludeScheduleId ? { id: { not: parseInt(excludeScheduleId) } } : {})
                }
            });
            if (existingStudentSchedule) {
                conflicts.push(`Student ${student.student_name} (${student.cb_no}) is already scheduled in this Viva Period.`);
            }

            // Check in-memory duplicates for bulk import
            const inMemoryStudentDup = inMemorySchedules.find(s => 
                s.student_id === student.id && s._tempId !== input._tempId
            );
            if (inMemoryStudentDup) {
                conflicts.push(`Duplicate entry for student ${student.student_name} (${student.cb_no}) within the uploaded file.`);
            }
        }

        // 9. Conflict Detection (Overlaps for Supervisor, Assessor, Student)
        if (formattedDate && startMins !== null && endMins !== null) {
            const slotDate = new Date(formattedDate);
            const startTimeDate = new Date(`${formattedDate}T${this.minutesToTimeString(startMins)}:00Z`);
            const endTimeDate = new Date(`${formattedDate}T${this.minutesToTimeString(endMins)}:00Z`);

            // Check existing database schedules on that date
            const existingSchedules = await prisma.viva_schedules.findMany({
                where: {
                    date: slotDate,
                    ...(excludeScheduleId ? { id: { not: parseInt(excludeScheduleId) } } : {})
                },
                include: {
                    students: true,
                    supervisors: true,
                    assessors: true
                }
            });

            const checkOverlap = (existStart, existEnd, newStart, newEnd) => {
                const eStart = existStart.getUTCHours() * 60 + existStart.getUTCMinutes();
                const eEnd = existEnd.getUTCHours() * 60 + existEnd.getUTCMinutes();
                return eStart < newEnd && eEnd > newStart;
            };

            for (const sch of existingSchedules) {
                if (!sch.start_time || !sch.end_time) continue;
                const isOverlapping = checkOverlap(sch.start_time, sch.end_time, startMins, endMins);
                if (isOverlapping) {
                    const timeRangeStr = `${this.minutesToTimeString(sch.start_time.getUTCHours() * 60 + sch.start_time.getUTCMinutes())} - ${this.minutesToTimeString(sch.end_time.getUTCHours() * 60 + sch.end_time.getUTCMinutes())}`;
                    
                    if (supervisor && sch.supervisor_id === supervisor.id) {
                        conflicts.push(`Supervisor '${supervisor.name}' has a schedule conflict on ${formattedDate} (${timeRangeStr}) with student ${sch.students?.student_name}.`);
                    }
                    if (assessor && sch.assessor_id === assessor.id) {
                        conflicts.push(`Assessor '${assessor.name}' has a schedule conflict on ${formattedDate} (${timeRangeStr}) with student ${sch.students?.student_name}.`);
                    }
                }
            }

            // Also check against in-memory schedules (for Excel batch upload)
            for (const item of inMemorySchedules) {
                if (item._tempId === input._tempId) continue;
                if (item.formattedDate === formattedDate && item.startMins !== null && item.endMins !== null) {
                    const isOverlapping = item.startMins < endMins && item.endMins > startMins;
                    if (isOverlapping) {
                        const timeRangeStr = `${this.minutesToTimeString(item.startMins)} - ${this.minutesToTimeString(item.endMins)}`;
                        if (supervisor && item.supervisor_id === supervisor.id) {
                            conflicts.push(`Supervisor '${supervisor.name}' has overlapping slots on ${formattedDate} at ${timeRangeStr} in this upload.`);
                        }
                        if (assessor && item.assessor_id === assessor.id) {
                            conflicts.push(`Assessor '${assessor.name}' has overlapping slots on ${formattedDate} at ${timeRangeStr} in this upload.`);
                        }
                    }
                }
            }
        }

        const isValid = errors.length === 0;

        const parsedData = isValid ? {
            student_id: student.id,
            supervisor_id: supervisor ? supervisor.id : null,
            assessor_id: assessor ? assessor.id : null,
            batch_code: input.batch_code || input["Batch Code"] || student.batches?.batch_code || null,
            date: formattedDate ? new Date(formattedDate) : null,
            start_time: (formattedDate && startMins !== null) ? new Date(`${formattedDate}T${this.minutesToTimeString(startMins)}:00Z`) : null,
            end_time: (formattedDate && endMins !== null) ? new Date(`${formattedDate}T${this.minutesToTimeString(endMins)}:00Z`) : null,
            duration_mins: duration,
            attendance_mode: rawMode,
            mode: rawMode,
            venue: venue,
            report_link: input.report_link || input["Report Link"] || input["Submission Link"] || null,
            teams_join_url: input.teams_link || input.teams_join_url || input["Teams Link"] || null,
            student_name: student.student_name,
            cb_no: student.cb_no,
            supervisor_name: supervisor ? supervisor.name : "",
            assessor_name: assessor ? assessor.name : "",
            formattedDate,
            startMins,
            endMins,
            timeStr: startMins !== null ? this.minutesToTimeString(startMins) : ""
        } : null;

        return {
            isValid,
            errors,
            warnings,
            conflicts,
            parsedData
        };
    }
}

module.exports = VivaValidationService;
