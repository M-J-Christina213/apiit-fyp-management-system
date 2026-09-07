const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const VivaValidationService = require("../services/vivaValidationService");
const MicrosoftGraphService = require("../services/microsoftGraphService");
const VivaAuditService = require("../services/vivaAuditService");
const NotificationService = require("../services/notificationService");
const schedulingService = require("../services/vivaSchedulingService");

// Allowed status transitions for Viva Periods
const ALLOWED_PERIOD_TRANSITIONS = {
    DRAFT: ["SCHEDULING", "CANCELLED"],
    SCHEDULING: ["AWAITING_CONFIRMATIONS", "DRAFT", "CANCELLED"],
    AWAITING_CONFIRMATIONS: ["READY_TO_FINALIZE", "SCHEDULING", "CANCELLED"],
    READY_TO_FINALIZE: ["FINALIZED", "AWAITING_CONFIRMATIONS", "CANCELLED"],
    FINALIZED: ["COMPLETED", "CANCELLED"],
    CANCELLED: ["DRAFT"],
    COMPLETED: []
};

// ======================================================
// 1. ADMIN - GET BATCHES WITH STUDENTS
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
// 2. ADMIN - GET ALL VIVA PERIODS
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
                    select: { viva_schedules: true, viva_audit_logs: true }
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
// 3. ADMIN - GET SINGLE VIVA PERIOD
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
                    select: { viva_schedules: true, viva_audit_logs: true }
                }
            }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });
        res.status(200).json(period);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch Viva Period", details: error.message });
    }
};

// ======================================================
// 4. ADMIN - CREATE VIVA PERIOD
// ======================================================
exports.createVivaPeriod = async (req, res) => {
    const { name, academic_year, semester, intake, batches, start_date, end_date, daily_start_time, daily_end_time, slot_duration } = req.body;

    if (!name || !batches || !batches.length || !start_date || !end_date) {
        return res.status(400).json({ error: "Missing required Viva Period fields (name, batches, start_date, end_date)." });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: "Invalid date format" });
    if (start > end) return res.status(400).json({ error: "End date must be after or equal to start date." });

    const duration = parseInt(slot_duration || 30, 10);

    try {
        const dbBatches = await prisma.batches.findMany({
            where: { id: { in: batches.map(Number) } }
        });
        if (dbBatches.length === 0) return res.status(400).json({ error: "Selected batches do not exist." });

        const stages = [...new Set(dbBatches.map(b => b.stage))];
        const type = stages.length > 0 && stages[0] ? `${stages[0]} Viva` : "FYP Viva";

        const period = await prisma.viva_periods.create({
            data: {
                name,
                academic_year: academic_year || "2026",
                semester: semester || "Semester 1",
                type,
                intake: intake || dbBatches[0].batch_intake || "General",
                start_date: start,
                end_date: end,
                daily_start_time: daily_start_time || "09:00",
                daily_end_time: daily_end_time || "17:00",
                slot_duration: duration,
                status: "DRAFT",
                viva_period_batches: {
                    create: batches.map(batch_id => ({ batch_id: Number(batch_id) }))
                }
            }
        });

        await VivaAuditService.log({
            viva_period_id: period.id,
            action: "ADMIN_CREATED_PERIOD",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Created Viva Period '${name}' (${start_date} to ${end_date})`
        });

        res.status(201).json({ message: "Viva Period created successfully", period });
    } catch (error) {
        console.error("Create Viva Period Error:", error);
        res.status(500).json({ error: "Failed to create Viva Period", details: error.message });
    }
};

// ======================================================
// 5. ADMIN - UPDATE VIVA PERIOD
// ======================================================
exports.updateVivaPeriod = async (req, res) => {
    const periodId = parseInt(req.params.id);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    const { name, academic_year, semester, intake, batches, start_date, end_date, daily_start_time, daily_end_time, slot_duration } = req.body;

    try {
        const existing = await prisma.viva_periods.findUnique({ where: { id: periodId } });
        if (!existing) return res.status(404).json({ error: "Viva Period not found" });

        const updatedData = {};
        if (name) updatedData.name = name;
        if (academic_year) updatedData.academic_year = academic_year;
        if (semester) updatedData.semester = semester;
        if (intake) updatedData.intake = intake;
        if (start_date) updatedData.start_date = new Date(start_date);
        if (end_date) updatedData.end_date = new Date(end_date);
        if (daily_start_time) updatedData.daily_start_time = daily_start_time;
        if (daily_end_time) updatedData.daily_end_time = daily_end_time;
        if (slot_duration) updatedData.slot_duration = parseInt(slot_duration, 10);

        if (batches && Array.isArray(batches)) {
            await prisma.viva_period_batches.deleteMany({ where: { viva_period_id: periodId } });
            updatedData.viva_period_batches = {
                create: batches.map(batch_id => ({ batch_id: Number(batch_id) }))
            };
        }

        const period = await prisma.viva_periods.update({
            where: { id: periodId },
            data: updatedData
        });

        await VivaAuditService.log({
            viva_period_id: periodId,
            action: "ADMIN_UPDATED_PERIOD",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Updated Viva Period '${period.name || periodId}'`
        });

        res.status(200).json({ message: "Viva Period updated successfully", period });
    } catch (error) {
        console.error("Update Viva Period Error:", error);
        res.status(500).json({ error: "Failed to update Viva Period", details: error.message });
    }
};

// ======================================================
// 6. ADMIN - UPDATE VIVA PERIOD STATUS (ENFORCED STATE TRANSITIONS)
// ======================================================
exports.updateVivaPeriodStatus = async (req, res) => {
    const periodId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });
    if (!status) return res.status(400).json({ error: "New status is required" });

    const targetStatus = status.toUpperCase().trim();

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: { viva_schedules: true }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        const currentStatus = (period.status || "DRAFT").toUpperCase();
        const allowed = ALLOWED_PERIOD_TRANSITIONS[currentStatus] || [];

        if (!allowed.includes(targetStatus)) {
            return res.status(400).json({
                error: `Invalid status transition. Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(", ") || "None"}.`
            });
        }

        // If transitioning to CANCELLED and was FINALIZED, cleanup Outlook events if present
        if (targetStatus === "CANCELLED" && currentStatus === "FINALIZED") {
            for (const sch of period.viva_schedules) {
                if (sch.outlook_event_id) {
                    await MicrosoftGraphService.deleteCalendarEvent(sch.outlook_event_id);
                }
            }
        }

        const updatedPeriod = await prisma.viva_periods.update({
            where: { id: periodId },
            data: { status: targetStatus }
        });

        await VivaAuditService.log({
            viva_period_id: periodId,
            action: "PERIOD_STATUS_CHANGED",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Status transitioned from ${currentStatus} to ${targetStatus}`
        });

        res.status(200).json({ message: `Viva Period status updated to ${targetStatus}`, period: updatedPeriod });
    } catch (error) {
        console.error("Status Update Error:", error);
        res.status(500).json({ error: "Failed to update status", details: error.message });
    }
};

// ======================================================
// 7. ADMIN - DELETE VIVA PERIOD
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
// 8. DASHBOARD STATISTICS
// ======================================================
exports.getDashboardStats = async (req, res) => {
    try {
        const [
            totalPeriods,
            activePeriods,
            totalSchedules,
            finalizedSchedules,
            pendingConfirmations,
            totalChangeRequests,
            pendingChangeRequests
        ] = await Promise.all([
            prisma.viva_periods.count(),
            prisma.viva_periods.count({ where: { status: { in: ["SCHEDULING", "AWAITING_CONFIRMATIONS", "READY_TO_FINALIZE"] } } }),
            prisma.viva_schedules.count(),
            prisma.viva_schedules.count({ where: { status: "FINALIZED" } }),
            prisma.viva_confirmations.count({ where: { status: "PENDING" } }),
            prisma.viva_change_requests.count(),
            prisma.viva_change_requests.count({ where: { status: "PENDING" } })
        ]);

        res.status(200).json({
            totalPeriods,
            activePeriods,
            totalSchedules,
            finalizedSchedules,
            pendingConfirmations,
            totalChangeRequests,
            pendingChangeRequests
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch dashboard statistics", details: error.message });
    }
};

// ======================================================
// 9. EXCEL UPLOAD WORKFLOW - VALIDATE & PREVIEW
// ======================================================
exports.validateExcelSchedule = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    if (!req.file) {
        return res.status(400).json({ error: "Please upload an Excel spreadsheet file (.xlsx or .xls)." });
    }

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: { viva_period_batches: true }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return res.status(400).json({ error: "The uploaded workbook does not contain any sheets." });
        }

        // Parse header row
        const headers = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value || "").trim();
        });

        // Normalize header mapping
        const findCol = (terms) => {
            for (let i = 1; i < headers.length; i++) {
                const h = (headers[i] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                for (const t of terms) {
                    if (h.includes(t.toLowerCase().replace(/[^a-z0-9]/g, ""))) return i;
                }
            }
            return null;
        };

        const colBatch = findCol(["batchcode", "batch"]);
        const colName = findCol(["studentname", "name"]);
        const colCb = findCol(["cbno", "cb", "studentid"]);
        const colSup = findCol(["supervisor", "supervisorname"]);
        const colAss = findCol(["assessor", "assessorname"]);
        const colDate = findCol(["proposeddate", "date"]);
        const colTime = findCol(["proposedtime", "time", "starttime"]);
        const colMode = findCol(["attendancemode", "mode"]);
        const colVenue = findCol(["venue", "location"]);
        const colReport = findCol(["reportlink", "submissionlink", "report"]);

        if (!colCb && !colName) {
            return res.status(400).json({
                error: "Excel structure invalid. Could not find 'CB No' or 'Name' column in header row."
            });
        }

        const rawRows = [];
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            // Skip empty rows
            const cbVal = colCb ? row.getCell(colCb).value : null;
            const nameVal = colName ? row.getCell(colName).value : null;
            if (!cbVal && !nameVal) continue;

            const extractVal = (col) => {
                if (!col) return "";
                const cell = row.getCell(col);
                if (cell.value === null || cell.value === undefined) return "";
                if (typeof cell.value === "object" && cell.value.text) return cell.value.text;
                if (typeof cell.value === "object" && cell.value.result) return cell.value.result;
                return String(cell.value).trim();
            };

            rawRows.push({
                _rowNumber: rowNumber,
                _tempId: `row_${rowNumber}`,
                batch_code: extractVal(colBatch),
                student_name: extractVal(colName),
                cb_no: extractVal(colCb),
                supervisor_name: extractVal(colSup),
                assessor_name: extractVal(colAss),
                proposed_date: extractVal(colDate),
                proposed_time: extractVal(colTime),
                attendance_mode: extractVal(colMode) || "PHYSICAL",
                venue: extractVal(colVenue) || "TBA",
                report_link: extractVal(colReport) || null
            });
        }

        if (rawRows.length === 0) {
            return res.status(400).json({ error: "The uploaded Excel sheet contains no student data rows." });
        }

        // Validate all rows using shared VivaValidationService
        const validatedRows = [];
        const inMemorySchedules = [];

        let validCount = 0;
        let warningCount = 0;
        let errorCount = 0;
        let conflictCount = 0;

        for (const raw of rawRows) {
            const validation = await VivaValidationService.validateScheduleEntry(
                raw,
                period,
                null,
                inMemorySchedules
            );

            if (validation.isValid && validation.parsedData) {
                inMemorySchedules.push({
                    _tempId: raw._tempId,
                    student_id: validation.parsedData.student_id,
                    supervisor_id: validation.parsedData.supervisor_id,
                    assessor_id: validation.parsedData.assessor_id,
                    formattedDate: validation.parsedData.formattedDate,
                    startMins: validation.parsedData.startMins,
                    endMins: validation.parsedData.endMins
                });
                validCount++;
            } else {
                errorCount++;
            }

            if (validation.warnings.length > 0) warningCount += validation.warnings.length;
            if (validation.conflicts.length > 0) conflictCount += validation.conflicts.length;

            validatedRows.push({
                rowNumber: raw._rowNumber,
                raw,
                isValid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings,
                conflicts: validation.conflicts,
                parsedData: validation.parsedData
            });
        }

        res.status(200).json({
            periodId,
            periodName: period.name || period.type,
            totalRows: rawRows.length,
            validRows: validCount,
            errorCount,
            warningCount,
            conflictCount,
            canImport: errorCount === 0,
            preview: validatedRows
        });
    } catch (error) {
        console.error("Validate Excel Schedule Error:", error);
        res.status(500).json({ error: "Failed to parse and validate Excel file", details: error.message });
    }
};

// ======================================================
// 10. EXCEL UPLOAD WORKFLOW - CONFIRM IMPORT
// ======================================================
exports.importExcelSchedule = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    const { validatedRows } = req.body;

    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });
    if (!validatedRows || !Array.isArray(validatedRows) || validatedRows.length === 0) {
        return res.status(400).json({ error: "No validated schedule rows provided for import." });
    }

    try {
        const period = await prisma.viva_periods.findUnique({ where: { id: periodId } });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        const createdSchedules = [];

        // Transactional insert with confirmations
        await prisma.$transaction(async (tx) => {
            for (const item of validatedRows) {
                const data = item.parsedData;
                if (!data || !data.student_id) continue;

                // Create schedule
                const schedule = await tx.viva_schedules.create({
                    data: {
                        viva_period_id: periodId,
                        student_id: data.student_id,
                        supervisor_id: data.supervisor_id,
                        assessor_id: data.assessor_id,
                        batch_code: data.batch_code,
                        date: data.date,
                        start_time: data.start_time,
                        end_time: data.end_time,
                        duration_mins: data.duration_mins || period.slot_duration || 30,
                        attendance_mode: data.attendance_mode || "PHYSICAL",
                        mode: data.attendance_mode || "PHYSICAL",
                        venue: data.venue || (data.attendance_mode === "ONLINE" ? "Microsoft Teams" : "TBA"),
                        report_link: data.report_link || null,
                        teams_join_url: data.teams_join_url || null,
                        status: "PENDING",
                        outlook_sync_status: "NOT_SYNCED"
                    }
                });

                // Create initial confirmations for supervisor & assessor
                if (data.supervisor_id) {
                    await tx.viva_confirmations.create({
                        data: {
                            viva_schedule_id: schedule.id,
                            user_id: null,
                            role: "SUPERVISOR",
                            status: "PENDING",
                            attendance_mode: data.attendance_mode || "PHYSICAL"
                        }
                    });
                }
                if (data.assessor_id) {
                    await tx.viva_confirmations.create({
                        data: {
                            viva_schedule_id: schedule.id,
                            user_id: null,
                            role: "ASSESSOR",
                            status: "PENDING",
                            attendance_mode: data.attendance_mode || "PHYSICAL"
                        }
                    });
                }

                createdSchedules.push(schedule);
            }

            // Update period status to AWAITING_CONFIRMATIONS if it was DRAFT or SCHEDULING
            if (period.status === "DRAFT" || period.status === "SCHEDULING") {
                await tx.viva_periods.update({
                    where: { id: periodId },
                    data: { status: "AWAITING_CONFIRMATIONS" }
                });
            }
        });

        await VivaAuditService.log({
            viva_period_id: periodId,
            action: "EXCEL_SCHEDULE_IMPORTED",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Imported ${createdSchedules.length} Viva schedule slots via Excel spreadsheet.`
        });

        res.status(201).json({
            message: `Successfully imported ${createdSchedules.length} Viva schedules.`,
            count: createdSchedules.length
        });
    } catch (error) {
        console.error("Import Excel Schedule Error:", error);
        res.status(500).json({ error: "Failed to import schedule rows", details: error.message });
    }
};

// ======================================================
// 11. MANUAL SCHEDULE CREATION (UNIFIED VALIDATION PIPELINE)
// ======================================================
exports.createManualSchedule = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: { viva_period_batches: true }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        // Validate using the unified validation engine
        const validation = await VivaValidationService.validateScheduleEntry(req.body, period);

        if (!validation.isValid) {
            return res.status(400).json({
                error: "Schedule validation failed.",
                errors: validation.errors,
                warnings: validation.warnings,
                conflicts: validation.conflicts
            });
        }

        const data = validation.parsedData;

        // Transactional insert
        const newSchedule = await prisma.$transaction(async (tx) => {
            const sch = await tx.viva_schedules.create({
                data: {
                    viva_period_id: periodId,
                    student_id: data.student_id,
                    supervisor_id: data.supervisor_id,
                    assessor_id: data.assessor_id,
                    batch_code: data.batch_code,
                    date: data.date,
                    start_time: data.start_time,
                    end_time: data.end_time,
                    duration_mins: data.duration_mins,
                    attendance_mode: data.attendance_mode,
                    mode: data.attendance_mode,
                    venue: data.venue,
                    report_link: data.report_link,
                    teams_join_url: data.teams_join_url,
                    status: "PENDING",
                    outlook_sync_status: "NOT_SYNCED"
                },
                include: {
                    students: true,
                    supervisors: true,
                    assessors: true
                }
            });

            if (data.supervisor_id) {
                await tx.viva_confirmations.create({
                    data: {
                        viva_schedule_id: sch.id,
                        role: "SUPERVISOR",
                        status: "PENDING",
                        attendance_mode: data.attendance_mode
                    }
                });
            }

            if (data.assessor_id) {
                await tx.viva_confirmations.create({
                    data: {
                        viva_schedule_id: sch.id,
                        role: "ASSESSOR",
                        status: "PENDING",
                        attendance_mode: data.attendance_mode
                    }
                });
            }

            return sch;
        });

        await VivaAuditService.log({
            viva_period_id: periodId,
            viva_schedule_id: newSchedule.id,
            action: "MANUAL_SCHEDULE_CREATED",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Manually created Viva schedule for ${newSchedule.students?.student_name} (${newSchedule.students?.cb_no}) on ${data.formattedDate} at ${data.timeStr}`
        });

        res.status(201).json({
            message: "Viva schedule created successfully.",
            schedule: newSchedule,
            warnings: validation.warnings,
            conflicts: validation.conflicts
        });
    } catch (error) {
        console.error("Create Manual Schedule Error:", error);
        res.status(500).json({ error: "Failed to create manual Viva schedule", details: error.message });
    }
};

// ======================================================
// 12. GET SCHEDULES FOR PERIOD (ADMIN & PM)
// ======================================================
exports.getSchedules = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const schedules = await prisma.viva_schedules.findMany({
            where: { viva_period_id: periodId },
            include: {
                students: { include: { batches: true } },
                supervisors: true,
                assessors: true,
                viva_periods: true,
                viva_confirmations: true,
                viva_change_requests: {
                    orderBy: { created_at: "desc" }
                }
            },
            orderBy: [{ date: "asc" }, { start_time: "asc" }]
        });

        // Compute overall confirmation status for each schedule
        const enriched = schedules.map(sch => {
            const supConf = sch.viva_confirmations.find(c => c.role === "SUPERVISOR");
            const assConf = sch.viva_confirmations.find(c => c.role === "ASSESSOR");
            const pendingChange = sch.viva_change_requests.find(cr => cr.status === "PENDING");

            let overallStatus = "PENDING";
            if (sch.status === "FINALIZED") {
                overallStatus = "FINALIZED";
            } else if (pendingChange) {
                overallStatus = "CHANGE_REQUESTED";
            } else if (supConf?.status === "CONFIRMED" && assConf?.status === "CONFIRMED") {
                overallStatus = "READY";
            } else if (supConf?.status === "CONFIRMED" && (!assConf || assConf.status === "PENDING")) {
                overallStatus = "SUPERVISOR_CONFIRMED";
            } else if (assConf?.status === "CONFIRMED" && (!supConf || supConf.status === "PENDING")) {
                overallStatus = "ASSESSOR_CONFIRMED";
            }

            return {
                ...sch,
                overallStatus,
                supervisorConfirmation: supConf || null,
                assessorConfirmation: assConf || null,
                activeChangeRequest: pendingChange || null
            };
        });

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Get Schedules Error:", error);
        res.status(500).json({ error: "Failed to fetch schedules", details: error.message });
    }
};

// ======================================================
// 13. UPDATE SCHEDULE (WITH CONFIRMATION RESET & OUTLOOK SYNC)
// ======================================================
exports.updateSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });

    const {
        date,
        start_time,
        end_time,
        time,
        attendance_mode,
        venue,
        report_link,
        teams_join_url,
        supervisor_id,
        assessor_id
    } = req.body;

    try {
        const existing = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId },
            include: {
                students: true,
                supervisors: true,
                assessors: true,
                viva_periods: true
            }
        });
        if (!existing) return res.status(404).json({ error: "Schedule not found" });

        const updatedData = { updated_at: new Date() };

        let hasTimeOrVenueChanged = false;

        if (date) {
            const d = new Date(date);
            if (!isNaN(d)) {
                updatedData.date = d;
                hasTimeOrVenueChanged = true;
            }
        }

        if (time || start_time) {
            const rawTime = time || start_time;
            const startMins = VivaValidationService.timeToMinutes(rawTime);
            if (startMins !== null) {
                const dateStr = (updatedData.date || existing.date || new Date()).toISOString().split("T")[0];
                const timeStr = VivaValidationService.minutesToTimeString(startMins);
                updatedData.start_time = new Date(`${dateStr}T${timeStr}:00Z`);
                
                const duration = existing.duration_mins || 30;
                const endTimeStr = VivaValidationService.minutesToTimeString(startMins + duration);
                updatedData.end_time = new Date(`${dateStr}T${endTimeStr}:00Z`);
                hasTimeOrVenueChanged = true;
            }
        }

        if (attendance_mode) {
            const mode = attendance_mode.toUpperCase().trim();
            if (["PHYSICAL", "ONLINE", "HYBRID"].includes(mode)) {
                updatedData.attendance_mode = mode;
                updatedData.mode = mode;
                hasTimeOrVenueChanged = true;
            }
        }

        if (venue !== undefined) {
            updatedData.venue = venue;
            hasTimeOrVenueChanged = true;
        }

        if (report_link !== undefined) updatedData.report_link = report_link;
        if (teams_join_url !== undefined) updatedData.teams_join_url = teams_join_url;
        if (supervisor_id) updatedData.supervisor_id = parseInt(supervisor_id);
        if (assessor_id) updatedData.assessor_id = parseInt(assessor_id);

        // Transactionally update schedule and reset confirmations if time/mode/venue altered
        const updatedSchedule = await prisma.$transaction(async (tx) => {
            const sch = await tx.viva_schedules.update({
                where: { id: scheduleId },
                data: updatedData,
                include: {
                    students: true,
                    supervisors: true,
                    assessors: true,
                    viva_periods: true
                }
            });

            // CONFIRMATION RESET RULE: If schedule slot changed, reset confirmations to PENDING
            if (hasTimeOrVenueChanged && sch.status !== "FINALIZED") {
                await tx.viva_confirmations.updateMany({
                    where: { viva_schedule_id: scheduleId },
                    data: {
                        status: "PENDING",
                        confirmed_at: null,
                        comment: "Reset due to schedule change by administrator."
                    }
                });
            }

            return sch;
        });

        // If finalized, update Outlook calendar event
        if (updatedSchedule.status === "FINALIZED" && updatedSchedule.outlook_event_id) {
            const syncResult = await MicrosoftGraphService.updateCalendarEvent(
                updatedSchedule.outlook_event_id,
                updatedSchedule,
                updatedSchedule.viva_periods
            );
            if (!syncResult.success) {
                await prisma.viva_schedules.update({
                    where: { id: scheduleId },
                    data: {
                        outlook_sync_status: "FAILED",
                        outlook_sync_error: syncResult.error || "Failed to update Outlook event."
                    }
                });
            }
        }

        await VivaAuditService.log({
            viva_period_id: existing.viva_period_id,
            viva_schedule_id: scheduleId,
            action: "SCHEDULE_UPDATED",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Admin updated Viva schedule slot. Confirmation status reset: ${hasTimeOrVenueChanged}`
        });

        res.status(200).json({
            message: "Schedule updated successfully.",
            schedule: updatedSchedule,
            confirmationReset: hasTimeOrVenueChanged
        });
    } catch (error) {
        console.error("Update Schedule Error:", error);
        res.status(500).json({ error: "Failed to update schedule", details: error.message });
    }
};

// ======================================================
// 14. DELETE SCHEDULE
// ======================================================
exports.deleteSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });

    try {
        const sch = await prisma.viva_schedules.findUnique({ where: { id: scheduleId } });
        if (!sch) return res.status(404).json({ error: "Schedule not found" });

        // Clean up Outlook event if exists
        if (sch.outlook_event_id) {
            await MicrosoftGraphService.deleteCalendarEvent(sch.outlook_event_id);
        }

        await prisma.viva_schedules.delete({ where: { id: scheduleId } });

        await VivaAuditService.log({
            viva_period_id: sch.viva_period_id,
            viva_schedule_id: scheduleId,
            action: "SCHEDULE_DELETED",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Deleted schedule slot ID ${scheduleId}`
        });

        res.status(200).json({ message: "Schedule deleted successfully." });
    } catch (error) {
        console.error("Delete Schedule Error:", error);
        res.status(500).json({ error: "Failed to delete schedule", details: error.message });
    }
};

// ======================================================
// 15. SUPERVISOR & ASSESSOR - GET ASSIGNED SCHEDULES
// ======================================================
exports.getMyAssignedSchedules = async (req, res) => {
    const email = req.headers["x-user-email"];
    const roleHeader = (req.headers["x-user-role"] || "").toLowerCase();

    if (!email) {
        return res.status(400).json({ error: "User email header (x-user-email) is required." });
    }

    try {
        const supervisor = await prisma.supervisors.findFirst({
            where: { email: { equals: email.trim(), mode: "insensitive" } }
        });
        const assessor = await prisma.assessors.findFirst({
            where: { email: { equals: email.trim(), mode: "insensitive" } }
        });

        if (!supervisor && !assessor) {
            return res.status(200).json({
                schedules: [],
                asSupervisorCount: 0,
                asAssessorCount: 0
            });
        }

        const orFilters = [];
        if (supervisor) orFilters.push({ supervisor_id: supervisor.id });
        if (assessor) orFilters.push({ assessor_id: assessor.id });

        const schedules = await prisma.viva_schedules.findMany({
            where: {
                OR: orFilters,
                viva_periods: {
                    status: { notIn: ["DRAFT", "CANCELLED"] }
                }
            },
            include: {
                students: { include: { batches: true } },
                supervisors: true,
                assessors: true,
                viva_periods: true,
                viva_confirmations: true,
                viva_change_requests: {
                    orderBy: { created_at: "desc" }
                }
            },
            orderBy: [{ date: "asc" }, { start_time: "asc" }]
        });

        const mapped = schedules.map(sch => {
            const isSupervisor = supervisor && sch.supervisor_id === supervisor.id;
            const isAssessor = assessor && sch.assessor_id === assessor.id;
            const userRole = isSupervisor ? "SUPERVISOR" : "ASSESSOR";

            const myConfirmation = sch.viva_confirmations.find(c => c.role === userRole) || null;
            const myChangeRequest = sch.viva_change_requests.find(cr => cr.role === userRole) || null;

            return {
                ...sch,
                isSupervisor,
                isAssessor,
                assignedRole: userRole,
                myConfirmation,
                myChangeRequest,
                // Only show report link and Teams link if finalized or approved
                report_link: sch.status === "FINALIZED" ? sch.report_link : null,
                teams_join_url: sch.status === "FINALIZED" ? sch.teams_join_url : null
            };
        });

        res.status(200).json({
            schedules: mapped,
            asSupervisorCount: supervisor ? mapped.filter(s => s.isSupervisor).length : 0,
            asAssessorCount: assessor ? mapped.filter(s => s.isAssessor).length : 0
        });
    } catch (error) {
        console.error("Get My Assigned Schedules Error:", error);
        res.status(500).json({ error: "Failed to fetch assigned schedules", details: error.message });
    }
};

// ======================================================
// 16. SUPERVISOR & ASSESSOR - REVIEW AVAILABILITY (CONFIRM / CHANGE REQUEST)
// ======================================================
exports.submitReviewAvailability = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const email = req.headers["x-user-email"];
    const { action, attendance_mode, comment, reason, proposed_date, proposed_time } = req.body;

    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });
    if (!action || !["CONFIRM", "REQUEST_CHANGE"].includes(action.toUpperCase())) {
        return res.status(400).json({ error: "Action must be either 'CONFIRM' or 'REQUEST_CHANGE'." });
    }

    try {
        const schedule = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId },
            include: {
                students: true,
                supervisors: true,
                assessors: true,
                viva_periods: true,
                viva_confirmations: true
            }
        });
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });

        // Determine user role
        let userRole = null;
        let userId = null;

        if (schedule.supervisors?.email?.toLowerCase() === email?.toLowerCase()) {
            userRole = "SUPERVISOR";
            userId = schedule.supervisors.id;
        } else if (schedule.assessors?.email?.toLowerCase() === email?.toLowerCase()) {
            userRole = "ASSESSOR";
            userId = schedule.assessors.id;
        } else {
            // Check if admin is impersonating or submitting
            const user = await prisma.users.findUnique({ where: { email } });
            if (user?.role === "admin") {
                userRole = req.body.role || "SUPERVISOR";
            } else {
                return res.status(403).json({ error: "You are not assigned to this Viva session." });
            }
        }

        const mode = (attendance_mode || schedule.attendance_mode || "PHYSICAL").toUpperCase();

        if (action.toUpperCase() === "CONFIRM") {
            // Update or create confirmation record
            await prisma.viva_confirmations.upsert({
                where: {
                    id: schedule.viva_confirmations.find(c => c.role === userRole)?.id || 0
                },
                update: {
                    status: "CONFIRMED",
                    attendance_mode: mode,
                    comment: comment || null,
                    confirmed_at: new Date()
                },
                create: {
                    viva_schedule_id: scheduleId,
                    role: userRole,
                    status: "CONFIRMED",
                    attendance_mode: mode,
                    comment: comment || null,
                    confirmed_at: new Date()
                }
            });

            // Check if both supervisor and assessor have confirmed
            const allConfirmations = await prisma.viva_confirmations.findMany({
                where: { viva_schedule_id: scheduleId }
            });
            const supConfirmed = allConfirmations.find(c => c.role === "SUPERVISOR")?.status === "CONFIRMED";
            const assConfirmed = allConfirmations.find(c => c.role === "ASSESSOR")?.status === "CONFIRMED";

            if (supConfirmed && assConfirmed) {
                await prisma.viva_schedules.update({
                    where: { id: scheduleId },
                    data: { status: "CONFIRMED" }
                });
            }

            await VivaAuditService.log({
                viva_period_id: schedule.viva_period_id,
                viva_schedule_id: scheduleId,
                action: `${userRole}_CONFIRMED`,
                performed_by: email,
                role: userRole,
                details: `${userRole} confirmed availability (Mode: ${mode})`
            });

            // Notify Admin
            await NotificationService.notifyRole(
                "admin",
                "Viva Availability Confirmed",
                `${userRole} for student ${schedule.students?.student_name} confirmed availability.`
            );

            return res.status(200).json({ message: "Availability confirmed successfully." });
        } else {
            // REQUEST_CHANGE
            if (!reason) {
                return res.status(400).json({ error: "Reason for unavailability is required." });
            }

            const origDate = schedule.date;
            const origTimeStr = schedule.start_time 
                ? VivaValidationService.minutesToTimeString(schedule.start_time.getUTCHours() * 60 + schedule.start_time.getUTCMinutes())
                : "";

            const changeReq = await prisma.viva_change_requests.create({
                data: {
                    viva_schedule_id: scheduleId,
                    requested_by: userId,
                    role: userRole,
                    original_date: origDate,
                    original_time: origTimeStr,
                    proposed_date: proposed_date ? new Date(proposed_date) : null,
                    proposed_time: proposed_time || null,
                    attendance_mode: mode,
                    reason: reason,
                    status: "PENDING"
                }
            });

            // Update confirmation state
            await prisma.viva_confirmations.upsert({
                where: {
                    id: schedule.viva_confirmations.find(c => c.role === userRole)?.id || 0
                },
                update: {
                    status: "CHANGE_REQUESTED",
                    attendance_mode: mode,
                    comment: reason
                },
                create: {
                    viva_schedule_id: scheduleId,
                    role: userRole,
                    status: "CHANGE_REQUESTED",
                    attendance_mode: mode,
                    comment: reason
                }
            });

            await prisma.viva_schedules.update({
                where: { id: scheduleId },
                data: { status: "CHANGE_REQUESTED" }
            });

            await VivaAuditService.log({
                viva_period_id: schedule.viva_period_id,
                viva_schedule_id: scheduleId,
                action: `${userRole}_CHANGE_REQUESTED`,
                performed_by: email,
                role: userRole,
                details: `${userRole} requested schedule change. Reason: ${reason}`
            });

            // Notify Admin
            await NotificationService.notifyRole(
                "admin",
                "Viva Change Request Submitted",
                `${userRole} submitted a change request for student ${schedule.students?.student_name} (${schedule.students?.cb_no}).`
            );

            return res.status(201).json({
                message: "Change request submitted successfully to Admin.",
                changeRequest: changeReq
            });
        }
    } catch (error) {
        console.error("Submit Review Availability Error:", error);
        res.status(500).json({ error: "Failed to submit availability review", details: error.message });
    }
};

// ======================================================
// 17. ADMIN - CHANGE REQUEST CENTER
// ======================================================
exports.getChangeRequests = async (req, res) => {
    const periodId = req.query.periodId ? parseInt(req.query.periodId) : null;

    try {
        const where = {};
        if (periodId) {
            where.viva_schedules = { viva_period_id: periodId };
        }

        const requests = await prisma.viva_change_requests.findMany({
            where,
            include: {
                viva_schedules: {
                    include: {
                        students: true,
                        supervisors: true,
                        assessors: true,
                        viva_periods: true
                    }
                }
            },
            orderBy: { created_at: "desc" }
        });

        res.status(200).json(requests);
    } catch (error) {
        console.error("Get Change Requests Error:", error);
        res.status(500).json({ error: "Failed to fetch change requests", details: error.message });
    }
};

exports.resolveChangeRequest = async (req, res) => {
    const requestId = parseInt(req.params.requestId);
    const { action, admin_response, alternative_date, alternative_time } = req.body;

    if (isNaN(requestId)) return res.status(400).json({ error: "Invalid Change Request ID" });
    if (!action || !["ACCEPT", "REJECT", "SUGGEST_ALTERNATIVE"].includes(action.toUpperCase())) {
        return res.status(400).json({ error: "Action must be ACCEPT, REJECT, or SUGGEST_ALTERNATIVE." });
    }

    try {
        const request = await prisma.viva_change_requests.findUnique({
            where: { id: requestId },
            include: {
                viva_schedules: {
                    include: {
                        students: true,
                        supervisors: true,
                        assessors: true,
                        viva_periods: true
                    }
                }
            }
        });
        if (!request) return res.status(404).json({ error: "Change request not found" });

        const schedule = request.viva_schedules;

        if (action.toUpperCase() === "ACCEPT") {
            // Apply proposed date & time to schedule
            const updatedScheduleData = {
                updated_at: new Date()
            };
            if (request.proposed_date) {
                updatedScheduleData.date = request.proposed_date;
            }
            if (request.proposed_time) {
                const startMins = VivaValidationService.timeToMinutes(request.proposed_time);
                if (startMins !== null) {
                    const dateStr = (request.proposed_date || schedule.date || new Date()).toISOString().split("T")[0];
                    const timeStr = VivaValidationService.minutesToTimeString(startMins);
                    updatedScheduleData.start_time = new Date(`${dateStr}T${timeStr}:00Z`);
                    const duration = schedule.duration_mins || 30;
                    updatedScheduleData.end_time = new Date(`${dateStr}T${VivaValidationService.minutesToTimeString(startMins + duration)}:00Z`);
                }
            }
            if (request.attendance_mode) {
                updatedScheduleData.attendance_mode = request.attendance_mode;
                updatedScheduleData.mode = request.attendance_mode;
            }
            updatedScheduleData.status = "PENDING";

            await prisma.$transaction(async (tx) => {
                await tx.viva_schedules.update({
                    where: { id: schedule.id },
                    data: updatedScheduleData
                });

                // Reset confirmations to PENDING so both parties re-confirm accepted slot
                await tx.viva_confirmations.updateMany({
                    where: { viva_schedule_id: schedule.id },
                    data: {
                        status: "PENDING",
                        confirmed_at: null,
                        comment: "Reset following accepted schedule change request."
                    }
                });

                await tx.viva_change_requests.update({
                    where: { id: requestId },
                    data: {
                        status: "ACCEPTED",
                        admin_response: admin_response || "Change request accepted by Administrator.",
                        resolved_at: new Date()
                    }
                });
            });

            await VivaAuditService.log({
                viva_period_id: schedule.viva_period_id,
                viva_schedule_id: schedule.id,
                action: "CHANGE_REQUEST_ACCEPTED",
                performed_by: req.headers["x-user-email"] || "Admin",
                role: "ADMIN",
                details: `Accepted change request #${requestId}. Schedule updated to ${request.proposed_date} ${request.proposed_time}`
            });

            // Notify requester
            if (request.role === "SUPERVISOR" && schedule.supervisor_id) {
                await NotificationService.notifySupervisor(
                    schedule.supervisor_id,
                    "Viva Change Request Accepted",
                    `Your change request for ${schedule.students?.student_name} has been accepted.`
                );
            } else if (request.role === "ASSESSOR" && schedule.assessor_id) {
                await NotificationService.notifyAssessor(
                    schedule.assessor_id,
                    "Viva Change Request Accepted",
                    `Your change request for ${schedule.students?.student_name} has been accepted.`
                );
            }

            return res.status(200).json({ message: "Change request accepted and schedule updated." });
        } else if (action.toUpperCase() === "REJECT") {
            await prisma.$transaction(async (tx) => {
                await tx.viva_change_requests.update({
                    where: { id: requestId },
                    data: {
                        status: "REJECTED",
                        admin_response: admin_response || "Change request declined by Administrator.",
                        resolved_at: new Date()
                    }
                });

                await tx.viva_schedules.update({
                    where: { id: schedule.id },
                    data: { status: "PENDING" }
                });
            });

            await VivaAuditService.log({
                viva_period_id: schedule.viva_period_id,
                viva_schedule_id: schedule.id,
                action: "CHANGE_REQUEST_REJECTED",
                performed_by: req.headers["x-user-email"] || "Admin",
                role: "ADMIN",
                details: `Rejected change request #${requestId}. Reason: ${admin_response || "None"}`
            });

            if (request.role === "SUPERVISOR" && schedule.supervisor_id) {
                await NotificationService.notifySupervisor(
                    schedule.supervisor_id,
                    "Viva Change Request Declined",
                    `Your change request for ${schedule.students?.student_name} was declined: ${admin_response || "Please attend original slot."}`
                );
            } else if (request.role === "ASSESSOR" && schedule.assessor_id) {
                await NotificationService.notifyAssessor(
                    schedule.assessor_id,
                    "Viva Change Request Declined",
                    `Your change request for ${schedule.students?.student_name} was declined: ${admin_response || "Please attend original slot."}`
                );
            }

            return res.status(200).json({ message: "Change request rejected." });
        } else {
            // SUGGEST_ALTERNATIVE
            await prisma.viva_change_requests.update({
                where: { id: requestId },
                data: {
                    status: "ALTERNATIVE_SUGGESTED",
                    admin_response: admin_response || `Alternative suggested: ${alternative_date} at ${alternative_time}`,
                    proposed_date: alternative_date ? new Date(alternative_date) : request.proposed_date,
                    proposed_time: alternative_time || request.proposed_time
                }
            });

            await VivaAuditService.log({
                viva_period_id: schedule.viva_period_id,
                viva_schedule_id: schedule.id,
                action: "ALTERNATIVE_SUGGESTED",
                performed_by: req.headers["x-user-email"] || "Admin",
                role: "ADMIN",
                details: `Admin suggested alternative date/time: ${alternative_date} ${alternative_time}`
            });

            return res.status(200).json({ message: "Alternative date/time suggested to participant." });
        }
    } catch (error) {
        console.error("Resolve Change Request Error:", error);
        res.status(500).json({ error: "Failed to resolve change request", details: error.message });
    }
};

// ======================================================
// 18. FINALIZATION WORKFLOW - CHECKLIST & SUMMARY
// ======================================================
exports.getFinalizationChecklist = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: {
                viva_schedules: {
                    include: {
                        students: true,
                        supervisors: true,
                        assessors: true,
                        viva_confirmations: true,
                        viva_change_requests: true
                    }
                }
            }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        const schedules = period.viva_schedules;
        const totalStudents = schedules.length;

        let confirmedCount = 0;
        let pendingCount = 0;
        let changeRequestCount = 0;
        let venuesAssigned = 0;
        let venuesTBA = 0;
        let onlineCount = 0;
        let physicalCount = 0;
        let missingTeamsCount = 0;

        for (const sch of schedules) {
            const supConf = sch.viva_confirmations.find(c => c.role === "SUPERVISOR")?.status === "CONFIRMED";
            const assConf = sch.viva_confirmations.find(c => c.role === "ASSESSOR")?.status === "CONFIRMED";
            const hasPendingChange = sch.viva_change_requests.some(cr => cr.status === "PENDING");

            if (hasPendingChange) {
                changeRequestCount++;
            } else if (supConf && assConf) {
                confirmedCount++;
            } else {
                pendingCount++;
            }

            const mode = (sch.attendance_mode || "PHYSICAL").toUpperCase();
            if (mode === "ONLINE") {
                onlineCount++;
                if (!sch.teams_join_url) missingTeamsCount++;
            } else {
                physicalCount++;
            }

            if (!sch.venue || sch.venue === "TBA") {
                venuesTBA++;
            } else {
                venuesAssigned++;
            }
        }

        // Conflict check across all schedules
        const conflictItems = [];
        for (let i = 0; i < schedules.length; i++) {
            for (let j = i + 1; j < schedules.length; j++) {
                const a = schedules[i];
                const b = schedules[j];
                if (!a.date || !b.date || !a.start_time || !a.end_time || !b.start_time || !b.end_time) continue;
                if (a.date.toISOString().split("T")[0] === b.date.toISOString().split("T")[0]) {
                    const aStart = a.start_time.getUTCHours() * 60 + a.start_time.getUTCMinutes();
                    const aEnd = a.end_time.getUTCHours() * 60 + a.end_time.getUTCMinutes();
                    const bStart = b.start_time.getUTCHours() * 60 + b.start_time.getUTCMinutes();
                    const bEnd = b.end_time.getUTCHours() * 60 + b.end_time.getUTCMinutes();

                    if (aStart < bEnd && aEnd > bStart) {
                        if (a.supervisor_id && a.supervisor_id === b.supervisor_id) {
                            conflictItems.push(`Supervisor '${a.supervisors?.name}' assigned to both ${a.students?.student_name} and ${b.students?.student_name} at overlapping times.`);
                        }
                        if (a.assessor_id && a.assessor_id === b.assessor_id) {
                            conflictItems.push(`Assessor '${a.assessors?.name}' assigned to both ${a.students?.student_name} and ${b.students?.student_name} at overlapping times.`);
                        }
                    }
                }
            }
        }

        // Finalization readiness evaluation
        // IMPORTANT: TBA venues are WARNINGS, not blockers!
        const blockers = [];
        const warnings = [];

        if (totalStudents === 0) blockers.push("Viva Period has no scheduled student slots.");
        if (changeRequestCount > 0) blockers.push(`${changeRequestCount} change request(s) are pending resolution.`);
        if (conflictItems.length > 0) blockers.push(`${conflictItems.length} critical scheduling conflict(s) detected.`);

        if (pendingCount > 0) {
            warnings.push(`${pendingCount} session(s) still awaiting participant confirmations.`);
        }
        if (venuesTBA > 0) {
            warnings.push(`${venuesTBA} session venue(s) are currently TBA.`);
        }
        if (missingTeamsCount > 0) {
            warnings.push(`${missingTeamsCount} online session(s) do not have a Microsoft Teams link.`);
        }

        const isReadyToFinalize = blockers.length === 0;

        res.status(200).json({
            periodId,
            periodName: period.name || period.type,
            status: period.status,
            totalStudents,
            confirmed: confirmedCount,
            pending: pendingCount,
            changeRequests: changeRequestCount,
            schedulingConflicts: conflictItems.length,
            conflictDetails: conflictItems,
            venuesAssigned,
            venuesTBA,
            onlineCount,
            physicalCount,
            missingTeamsCount,
            blockers,
            warnings,
            isReadyToFinalize
        });
    } catch (error) {
        console.error("Get Finalization Checklist Error:", error);
        res.status(500).json({ error: "Failed to generate checklist", details: error.message });
    }
};

// ======================================================
// 19. FINALIZATION WORKFLOW - FINALIZE VIVA PERIOD
// ======================================================
exports.finalizeVivaPeriod = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const period = await prisma.viva_periods.findUnique({
            where: { id: periodId },
            include: {
                viva_schedules: {
                    include: {
                        students: true,
                        supervisors: true,
                        assessors: true
                    }
                }
            }
        });
        if (!period) return res.status(404).json({ error: "Viva Period not found" });

        const finalizedAt = new Date();

        // 1. Mark period and all schedules as FINALIZED
        await prisma.$transaction([
            prisma.viva_periods.update({
                where: { id: periodId },
                data: { status: "FINALIZED" }
            }),
            prisma.viva_schedules.updateMany({
                where: { viva_period_id: periodId },
                data: {
                    status: "FINALIZED",
                    finalized_at: finalizedAt
                }
            })
        ]);

        // 2. Microsoft Outlook & Teams synchronization
        let syncSuccessCount = 0;
        let syncFailedCount = 0;

        for (const sch of period.viva_schedules) {
            try {
                // If Online Viva and no teams link, create Teams meeting
                let teamsJoinUrl = sch.teams_join_url;
                let teamsMeetingId = sch.teams_meeting_id;

                if (sch.attendance_mode === "ONLINE" && !teamsJoinUrl) {
                    const teamsResult = await MicrosoftGraphService.createTeamsMeeting(sch, period);
                    if (teamsResult.success) {
                        teamsJoinUrl = teamsResult.joinWebUrl;
                        teamsMeetingId = teamsResult.meetingId;
                    }
                }

                // Create or update Outlook calendar event
                const calendarResult = await MicrosoftGraphService.createCalendarEvent(
                    { ...sch, teams_join_url: teamsJoinUrl, teams_meeting_id: teamsMeetingId },
                    period
                );

                if (calendarResult.success) {
                    syncSuccessCount++;
                    await prisma.viva_schedules.update({
                        where: { id: sch.id },
                        data: {
                            outlook_event_id: calendarResult.eventId,
                            teams_meeting_id: teamsMeetingId || calendarResult.teamsMeetingId || null,
                            teams_join_url: teamsJoinUrl || calendarResult.teamsJoinUrl || null,
                            outlook_sync_status: "SYNCED",
                            outlook_sync_error: null
                        }
                    });
                } else {
                    syncFailedCount++;
                    await prisma.viva_schedules.update({
                        where: { id: sch.id },
                        data: {
                            outlook_sync_status: "FAILED",
                            outlook_sync_error: calendarResult.error || "Calendar synchronization failed."
                        }
                    });
                }
            } catch (syncErr) {
                console.error(`Sync error for schedule ${sch.id}:`, syncErr.message);
                syncFailedCount++;
            }
        }

        // 3. Dispatch notifications to Students, Supervisors, Assessors, PM
        for (const sch of period.viva_schedules) {
            if (sch.student_id) {
                await NotificationService.notifyStudent(
                    sch.student_id,
                    "Viva Schedule Finalized",
                    `Your FYP Viva examination schedule has been finalized for ${sch.date ? new Date(sch.date).toLocaleDateString() : 'scheduled date'}. Venue: ${sch.venue || sch.attendance_mode}.`
                );
            }
            if (sch.supervisor_id) {
                await NotificationService.notifySupervisor(
                    sch.supervisor_id,
                    "Viva Sessions Finalized",
                    `Finalized Viva schedule has been published for your student ${sch.students?.student_name} (${sch.students?.cb_no}).`
                );
            }
            if (sch.assessor_id) {
                await NotificationService.notifyAssessor(
                    sch.assessor_id,
                    "Viva Sessions Finalized",
                    `Finalized Viva schedule has been published for student ${sch.students?.student_name} (${sch.students?.cb_no}).`
                );
            }
        }

        // Notify PM
        await NotificationService.notifyRole(
            "pm",
            "Viva Schedule Finalized",
            `Viva schedule for '${period.name || period.type}' has been finalized and published.`
        );

        await VivaAuditService.log({
            viva_period_id: periodId,
            action: "PERIOD_FINALIZED",
            performed_by: req.headers["x-user-email"] || "Admin",
            role: "ADMIN",
            details: `Finalized Viva Period '${period.name}'. Total slots: ${period.viva_schedules.length}. Outlook sync: ${syncSuccessCount} synced, ${syncFailedCount} failed.`
        });

        res.status(200).json({
            message: "Viva Period finalized successfully. Final schedules published and calendar events created.",
            totalSchedules: period.viva_schedules.length,
            syncSuccessCount,
            syncFailedCount
        });
    } catch (error) {
        console.error("Finalize Viva Period Error:", error);
        res.status(500).json({ error: "Failed to finalize Viva Period", details: error.message });
    }
};

// ======================================================
// 20. OUTLOOK SYNC RETRY & TEAMS MANAGEMENT
// ======================================================
exports.retryOutlookSync = async (req, res) => {
    const scheduleId = req.params.scheduleId ? parseInt(req.params.scheduleId) : null;
    const periodId = req.query.periodId ? parseInt(req.query.periodId) : null;

    try {
        const where = {};
        if (scheduleId) where.id = scheduleId;
        if (periodId) where.viva_period_id = periodId;

        const schedules = await prisma.viva_schedules.findMany({
            where: { ...where, status: "FINALIZED" },
            include: { students: true, supervisors: true, assessors: true, viva_periods: true }
        });

        if (schedules.length === 0) {
            return res.status(404).json({ error: "No finalized schedules found to synchronize." });
        }

        let successCount = 0;
        let failCount = 0;

        for (const sch of schedules) {
            const syncRes = await MicrosoftGraphService.createCalendarEvent(sch, sch.viva_periods);
            if (syncRes.success) {
                successCount++;
                await prisma.viva_schedules.update({
                    where: { id: sch.id },
                    data: {
                        outlook_event_id: syncRes.eventId,
                        teams_meeting_id: syncRes.teamsMeetingId || sch.teams_meeting_id,
                        teams_join_url: syncRes.teamsJoinUrl || sch.teams_join_url,
                        outlook_sync_status: "SYNCED",
                        outlook_sync_error: null
                    }
                });
            } else {
                failCount++;
                await prisma.viva_schedules.update({
                    where: { id: sch.id },
                    data: {
                        outlook_sync_status: "FAILED",
                        outlook_sync_error: syncRes.error
                    }
                });
            }
        }

        res.status(200).json({
            message: `Synchronization complete. ${successCount} succeeded, ${failCount} failed.`,
            successCount,
            failCount
        });
    } catch (error) {
        console.error("Retry Outlook Sync Error:", error);
        res.status(500).json({ error: "Failed to retry Outlook sync", details: error.message });
    }
};

// ======================================================
// 21. MICROSOFT 365 INTEGRATION ENDPOINTS
// ======================================================
exports.getMicrosoftAuthUrl = async (req, res) => {
    try {
        const url = MicrosoftGraphService.getAuthUrl("admin_viva_auth");
        res.status(200).json({ authUrl: url, isConfigured: MicrosoftGraphService.isConfigured() });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate auth URL", details: error.message });
    }
};

exports.handleMicrosoftCallback = async (req, res) => {
    const { code } = req.query;
    try {
        const result = await MicrosoftGraphService.handleAuthCallback(code || "simulated_code");
        res.status(200).json({ message: "Microsoft account connected successfully.", ...result });
    } catch (error) {
        console.error("Microsoft Auth Callback Error:", error);
        res.status(500).json({ error: "Failed to connect Microsoft account", details: error.message });
    }
};

exports.getMicrosoftStatus = async (req, res) => {
    try {
        const status = await MicrosoftGraphService.getIntegrationStatus();
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ error: "Failed to get Microsoft integration status", details: error.message });
    }
};

exports.disconnectMicrosoft = async (req, res) => {
    try {
        await MicrosoftGraphService.disconnect();
        res.status(200).json({ message: "Microsoft account disconnected." });
    } catch (error) {
        res.status(500).json({ error: "Failed to disconnect Microsoft account", details: error.message });
    }
};

// ======================================================
// 22. PRIVATE VIVA NOTES & ONEDRIVE REPORT LINK
// ======================================================
exports.getVivaNotes = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const email = req.headers["x-user-email"];
    const roleHeader = (req.headers["x-user-role"] || "").toLowerCase();

    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });

    // Students are strictly blocked from seeing internal Viva notes
    if (roleHeader === "student") {
        return res.status(403).json({ error: "Access denied. Private preparation notes are restricted to examiners." });
    }

    try {
        const schedule = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId },
            include: { supervisors: true, assessors: true }
        });
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });

        let filterRole = null;
        if (schedule.supervisors?.email?.toLowerCase() === email?.toLowerCase()) {
            filterRole = "SUPERVISOR";
        } else if (schedule.assessors?.email?.toLowerCase() === email?.toLowerCase()) {
            filterRole = "ASSESSOR";
        } else if (roleHeader === "admin" || roleHeader === "pm") {
            // Admin can see notes
            filterRole = req.query.role || null;
        } else {
            return res.status(403).json({ error: "Access denied to this session's notes." });
        }

        const where = { viva_schedule_id: scheduleId };
        if (filterRole) where.role = filterRole;

        const notes = await prisma.viva_notes.findMany({
            where,
            orderBy: { updated_at: "desc" }
        });

        res.status(200).json(notes);
    } catch (error) {
        console.error("Get Viva Notes Error:", error);
        res.status(500).json({ error: "Failed to fetch Viva notes", details: error.message });
    }
};

exports.saveVivaNote = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const email = req.headers["x-user-email"];
    const { note } = req.body;

    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });
    if (!note && note !== "") return res.status(400).json({ error: "Note content is required." });

    try {
        const schedule = await prisma.viva_schedules.findUnique({
            where: { id: scheduleId },
            include: { supervisors: true, assessors: true }
        });
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });

        let userRole = null;
        let userId = null;

        if (schedule.supervisors?.email?.toLowerCase() === email?.toLowerCase()) {
            userRole = "SUPERVISOR";
            userId = schedule.supervisors.id;
        } else if (schedule.assessors?.email?.toLowerCase() === email?.toLowerCase()) {
            userRole = "ASSESSOR";
            userId = schedule.assessors.id;
        } else {
            const adminUser = await prisma.users.findUnique({ where: { email } });
            if (adminUser?.role === "admin") {
                userRole = req.body.role || "SUPERVISOR";
            } else {
                return res.status(403).json({ error: "You are not authorized to add notes for this Viva session." });
            }
        }

        const existingNote = await prisma.viva_notes.findFirst({
            where: { viva_schedule_id: scheduleId, role: userRole }
        });

        let savedNote;
        if (existingNote) {
            savedNote = await prisma.viva_notes.update({
                where: { id: existingNote.id },
                data: { note, updated_at: new Date() }
            });
        } else {
            savedNote = await prisma.viva_notes.create({
                data: {
                    viva_schedule_id: scheduleId,
                    user_id: userId,
                    role: userRole,
                    note
                }
            });
        }

        res.status(200).json({ message: "Viva note saved successfully.", note: savedNote });
    } catch (error) {
        console.error("Save Viva Note Error:", error);
        res.status(500).json({ error: "Failed to save Viva note", details: error.message });
    }
};

exports.updateReportLink = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const { report_link } = req.body;

    if (isNaN(scheduleId)) return res.status(400).json({ error: "Invalid Schedule ID" });

    try {
        const updated = await prisma.viva_schedules.update({
            where: { id: scheduleId },
            data: { report_link }
        });
        res.status(200).json({ message: "Student report link updated.", schedule: updated });
    } catch (error) {
        res.status(500).json({ error: "Failed to update report link", details: error.message });
    }
};

// ======================================================
// 23. STUDENT - MY VIVA SCHEDULE
// ======================================================
exports.getMyStudentViva = async (req, res) => {
    const email = req.headers["x-user-email"];
    if (!email) return res.status(400).json({ error: "Student email header required." });

    try {
        const cbNo = email.split("@")[0].toUpperCase();
        const student = await prisma.students.findFirst({
            where: { cb_no: { equals: cbNo, mode: "insensitive" } },
            include: { batches: true }
        });

        if (!student) {
            return res.status(200).json({ schedule: null, message: "No student profile found for this account." });
        }

        // Find finalized viva schedule for this student
        const schedule = await prisma.viva_schedules.findFirst({
            where: {
                student_id: student.id,
                status: "FINALIZED"
            },
            include: {
                viva_periods: true,
                supervisors: { select: { id: true, name: true, email: true, title: true } },
                assessors: { select: { id: true, name: true, email: true, title: true } }
            }
        });

        res.status(200).json({
            student: { id: student.id, name: student.student_name, cb_no: student.cb_no, batch: student.batches?.batch_code },
            schedule: schedule || null
        });
    } catch (error) {
        console.error("Get Student Viva Error:", error);
        res.status(500).json({ error: "Failed to fetch student Viva schedule", details: error.message });
    }
};

// ======================================================
// 24. PM - VIVA OVERVIEW (READ-ONLY)
// ======================================================
exports.getPMVivaOverview = async (req, res) => {
    const periodId = req.params.periodId ? parseInt(req.params.periodId) : null;

    try {
        const where = periodId ? { id: periodId } : { status: "FINALIZED" };
        const periods = await prisma.viva_periods.findMany({
            where,
            include: {
                viva_schedules: {
                    where: { status: "FINALIZED" },
                    include: {
                        students: { include: { batches: true } },
                        supervisors: true,
                        assessors: true
                    }
                }
            },
            orderBy: { start_date: "desc" }
        });

        res.status(200).json(periods);
    } catch (error) {
        console.error("Get PM Viva Overview Error:", error);
        res.status(500).json({ error: "Failed to fetch PM overview", details: error.message });
    }
};

// ======================================================
// 25. AUDIT LOGS FOR PERIOD
// ======================================================
exports.getPeriodAuditLogs = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    if (isNaN(periodId)) return res.status(400).json({ error: "Invalid Viva Period ID" });

    try {
        const logs = await VivaAuditService.getLogs({ viva_period_id: periodId });
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch audit logs", details: error.message });
    }
};

// Legacy backward-compatibility endpoints
exports.publishVivaPeriod = exports.updateVivaPeriodStatus;
exports.triggerAutoScheduling = async (req, res) => {
    const periodId = parseInt(req.params.periodId);
    try {
        const schedules = await schedulingService.generateSchedules(periodId);
        res.status(200).json({ message: "Scheduling completed", schedules });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAvailabilityStatus = async (req, res) => res.status(200).json({});
exports.submitAvailability = async (req, res) => res.status(200).json({ message: "Deprecated" });
exports.getAvailability = async (req, res) => res.status(200).json([]);
exports.exportSchedules = async (req, res) => {
    const periodId = parseInt(req.params.id);
    const schedules = await prisma.viva_schedules.findMany({
        where: { viva_period_id: periodId },
        include: { students: true, supervisors: true, assessors: true, viva_periods: true }
    });
    let csv = "Batch,Student Name,CB No,Supervisor,Assessor,Date,Start Time,End Time,Mode,Venue,Status\n";
    schedules.forEach(s => {
        csv += `"${s.batch_code || ''}","${s.students?.student_name || ''}","${s.students?.cb_no || ''}","${s.supervisors?.name || ''}","${s.assessors?.name || ''}","${s.date ? new Date(s.date).toLocaleDateString() : ''}","${s.start_time ? new Date(s.start_time).toLocaleTimeString() : ''}","${s.end_time ? new Date(s.end_time).toLocaleTimeString() : ''}","${s.attendance_mode || s.mode || ''}","${s.venue || ''}","${s.status}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="viva-schedules-${periodId}.csv"`);
    res.status(200).send(csv);
};
exports.getMyPeriods = exports.getMyAssignedSchedules;
exports.getMyDashboard = async (req, res) => res.status(410).json({ error: "Deprecated" });
exports.finalizeSchedule = async (req, res) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const updated = await prisma.viva_schedules.update({
        where: { id: scheduleId },
        data: { status: "FINALIZED", finalized_at: new Date() }
    });
    res.status(200).json({ message: "Finalized", schedule: updated });
};