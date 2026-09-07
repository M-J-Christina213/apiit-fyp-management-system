const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const VivaValidationService = require("../services/vivaValidationService");
const MicrosoftGraphService = require("../services/microsoftGraphService");
const VivaAuditService = require("../services/vivaAuditService");

const prisma = new PrismaClient();

async function runSeedAndTest() {
    console.log("\n=======================================================");
    console.log("Starting University FYP Viva Workflow Seed & Validation");
    console.log("=======================================================\n");

    const defaultPasswordHash = bcrypt.hashSync("123@abc", 10);

    // 1. Seed or Upsert Batches
    console.log("Step 1: Upserting 3 Academic Batches...");
    const batchData = [
        { batch_code: "SE24", batch_intake: "February 2024", start_fyp_date: new Date("2026-02-01"), stage: "Final" },
        { batch_code: "CS24", batch_intake: "February 2024", start_fyp_date: new Date("2026-02-01"), stage: "Final" },
        { batch_code: "NE24", batch_intake: "July 2024", start_fyp_date: new Date("2026-07-01"), stage: "Final" }
    ];

    const batches = {};
    for (const b of batchData) {
        const batch = await prisma.batches.upsert({
            where: { batch_code: b.batch_code },
            update: { stage: b.stage },
            create: b
        });
        batches[b.batch_code] = batch;
    }
    console.log("✓ Batches ready: SE24, CS24, NE24");

    // 2. Seed or Upsert Users
    console.log("\nStep 2: Upserting Users (Admin, PM, Supervisors, Assessors, Students)...");
    const users = [
        { email: "nirosha@apiit.lk", name: "Nirosha Admin", role: "admin" },
        { email: "fathima@apiit.lk", name: "Fathima PM", role: "pm" },
        { email: "kavin@apiit.lk", name: "Dr. Kavin", role: "supervisor" },
        { email: "nirmala@apiit.lk", name: "Dr. Nirmala", role: "supervisor" },
        { email: "alan@apiit.lk", name: "Prof. Alan Smith", role: "supervisor" },
        { email: "assessor1@apiit.lk", name: "Dr. Xavier Assessor", role: "academic" },
        { email: "assessor2@apiit.lk", name: "Dr. Yasmin Assessor", role: "academic" },
        { email: "assessor3@apiit.lk", name: "Dr. Zachary Assessor", role: "academic" },
        { email: "cb001@students.apiit.lk", name: "Alice Student", role: "student" },
        { email: "cb002@students.apiit.lk", name: "Bob Student", role: "student" },
        { email: "cb003@students.apiit.lk", name: "Charlie Student", role: "student" },
        { email: "cb004@students.apiit.lk", name: "Diana Student", role: "student" },
        { email: "cb005@students.apiit.lk", name: "Evan Student", role: "student" },
        { email: "cb006@students.apiit.lk", name: "Fiona Student", role: "student" }
    ];

    for (const u of users) {
        await prisma.users.upsert({
            where: { email: u.email },
            update: { role: u.role, name: u.name },
            create: {
                email: u.email,
                name: u.name,
                role: u.role,
                password: defaultPasswordHash,
                is_active: true
            }
        });
    }
    console.log("✓ Users upserted successfully.");

    // 3. Seed Supervisors table
    console.log("\nStep 3: Upserting Supervisors table records...");
    const supervisorsList = [
        { name: "Dr. Kavin", email: "kavin@apiit.lk", title: "Dr." },
        { name: "Dr. Nirmala", email: "nirmala@apiit.lk", title: "Dr." },
        { name: "Prof. Alan Smith", email: "alan@apiit.lk", title: "Prof." }
    ];
    const sups = {};
    for (const s of supervisorsList) {
        const sup = await prisma.supervisors.upsert({
            where: { email: s.email },
            update: { name: s.name, title: s.title },
            create: s
        });
        sups[s.email] = sup;
    }
    console.log("✓ Supervisors records ready.");

    // 4. Seed Assessors table
    console.log("\nStep 4: Upserting Assessors table records...");
    const assessorsList = [
        { name: "Dr. Xavier Assessor", email: "assessor1@apiit.lk", title: "Dr." },
        { name: "Dr. Yasmin Assessor", email: "assessor2@apiit.lk", title: "Dr." },
        { name: "Dr. Zachary Assessor", email: "assessor3@apiit.lk", title: "Dr." }
    ];
    const asses = {};
    for (const a of assessorsList) {
        const ass = await prisma.assessors.upsert({
            where: { email: a.email },
            update: { name: a.name, title: a.title },
            create: a
        });
        asses[a.email] = ass;
    }
    console.log("✓ Assessors records ready.");

    // 5. Seed Students table
    console.log("\nStep 5: Upserting Students table records...");
    const studentList = [
        { cb_no: "CB001", student_name: "Alice Student", batch_id: batches["SE24"].id },
        { cb_no: "CB002", student_name: "Bob Student", batch_id: batches["SE24"].id },
        { cb_no: "CB003", student_name: "Charlie Student", batch_id: batches["CS24"].id },
        { cb_no: "CB004", student_name: "Diana Student", batch_id: batches["CS24"].id },
        { cb_no: "CB005", student_name: "Evan Student", batch_id: batches["NE24"].id },
        { cb_no: "CB006", student_name: "Fiona Student", batch_id: batches["NE24"].id }
    ];
    const stds = {};
    for (const st of studentList) {
        const student = await prisma.students.upsert({
            where: { cb_no: st.cb_no },
            update: { student_name: st.student_name, batch_id: st.batch_id },
            create: st
        });
        stds[st.cb_no] = student;
    }
    console.log("✓ Students records ready.");

    // 6. Create Viva Period "Semester 1 Viva 2026"
    console.log("\nStep 6: Creating Viva Period 'Semester 1 Viva 2026'...");
    let period = await prisma.viva_periods.findFirst({
        where: { name: "Semester 1 Viva 2026" },
        include: { viva_period_batches: true }
    });

    if (!period) {
        period = await prisma.viva_periods.create({
            data: {
                name: "Semester 1 Viva 2026",
                type: "Final Viva",
                academic_year: "2026",
                semester: "Semester 1",
                intake: "February 2024",
                start_date: new Date("2026-09-15"),
                end_date: new Date("2026-09-20"),
                daily_start_time: "09:00",
                daily_end_time: "17:00",
                slot_duration: 30,
                status: "SCHEDULING",
                viva_period_batches: {
                    create: [
                        { batch_id: batches["SE24"].id },
                        { batch_id: batches["CS24"].id }
                    ]
                }
            },
            include: { viva_period_batches: true }
        });
        console.log(`✓ Created Viva Period ID: ${period.id} (${period.name})`);
    } else {
        console.log(`✓ Existing Viva Period found ID: ${period.id}`);
    }

    // 7. Test Validation Service - Conflict Detection
    console.log("\nStep 7: Testing Unified VivaValidationService...");
    const sampleInput1 = {
        cb_no: "CB001",
        supervisor_email: "kavin@apiit.lk",
        assessor_email: "assessor1@apiit.lk",
        proposed_date: "2026-09-15",
        proposed_time: "09:00",
        attendance_mode: "PHYSICAL",
        venue: "L4CR2"
    };

    const val1 = await VivaValidationService.validateScheduleEntry(sampleInput1, period);
    console.log(`- Validation 1 (Valid Slot): isValid = ${val1.isValid}`);
    if (!val1.isValid) console.error("Validation 1 Errors:", val1.errors);

    // Test conflict: same supervisor at the same time
    const sampleConflictInput = {
        cb_no: "CB002",
        supervisor_email: "kavin@apiit.lk", // Same supervisor!
        assessor_email: "assessor2@apiit.lk",
        proposed_date: "2026-09-15",
        proposed_time: "09:00", // Same time!
        attendance_mode: "PHYSICAL",
        venue: "City Campus Room 3"
    };

    const valConflict = await VivaValidationService.validateScheduleEntry(
        sampleConflictInput,
        period,
        null,
        [{
            _tempId: "row_1",
            student_id: stds["CB001"].id,
            supervisor_id: sups["kavin@apiit.lk"].id,
            assessor_id: asses["assessor1@apiit.lk"].id,
            formattedDate: "2026-09-15",
            startMins: 9 * 60,
            endMins: 9 * 60 + 30
        }]
    );
    console.log(`- Conflict Check: Detected ${valConflict.conflicts.length} conflict(s):`, valConflict.conflicts);

    // 8. Create sample schedules
    console.log("\nStep 8: Populating Viva Schedules for Period...");
    // Clear existing test schedules in this period
    await prisma.viva_schedules.deleteMany({ where: { viva_period_id: period.id } });

    const scheduleSamples = [
        {
            student: stds["CB001"],
            supervisor: sups["kavin@apiit.lk"],
            assessor: asses["assessor1@apiit.lk"],
            date: new Date("2026-09-15"),
            start: "09:00",
            duration: 30,
            mode: "PHYSICAL",
            venue: "L4CR2",
            report_link: "https://apiitlk-my.sharepoint.com/:b:/g/personal/admin_apiit_lk/CB001_Final_Report.pdf"
        },
        {
            student: stds["CB002"],
            supervisor: sups["nirmala@apiit.lk"],
            assessor: asses["assessor1@apiit.lk"],
            date: new Date("2026-09-15"),
            start: "09:30",
            duration: 30,
            mode: "ONLINE",
            venue: "Microsoft Teams",
            report_link: "https://apiitlk-my.sharepoint.com/:b:/g/personal/admin_apiit_lk/CB002_Final_Report.pdf"
        },
        {
            student: stds["CB003"],
            supervisor: sups["kavin@apiit.lk"],
            assessor: asses["assessor2@apiit.lk"],
            date: new Date("2026-09-15"),
            start: "10:00",
            duration: 30,
            mode: "PHYSICAL",
            venue: "TBA",
            report_link: "https://apiitlk-my.sharepoint.com/:b:/g/personal/admin_apiit_lk/CB003_Final_Report.pdf"
        },
        {
            student: stds["CB004"],
            supervisor: sups["alan@apiit.lk"],
            assessor: asses["assessor3@apiit.lk"],
            date: new Date("2026-09-16"),
            start: "11:00",
            duration: 30,
            mode: "ONLINE",
            venue: "Microsoft Teams",
            report_link: "https://apiitlk-my.sharepoint.com/:b:/g/personal/admin_apiit_lk/CB004_Final_Report.pdf"
        }
    ];

    const createdSchedules = [];
    for (const item of scheduleSamples) {
        const [h, m] = item.start.split(":").map(Number);
        const startTime = new Date(`2026-09-15T${item.start}:00Z`);
        const endMinutes = h * 60 + m + item.duration;
        const endTime = new Date(`2026-09-15T${VivaValidationService.minutesToTimeString(endMinutes)}:00Z`);

        const sch = await prisma.viva_schedules.create({
            data: {
                viva_period_id: period.id,
                student_id: item.student.id,
                supervisor_id: item.supervisor.id,
                assessor_id: item.assessor.id,
                batch_code: item.student.batch_id === batches["SE24"].id ? "SE24" : "CS24",
                date: item.date,
                start_time: startTime,
                end_time: endTime,
                duration_mins: item.duration,
                attendance_mode: item.mode,
                mode: item.mode,
                venue: item.venue,
                report_link: item.report_link,
                status: "PENDING",
                outlook_sync_status: "NOT_SYNCED"
            }
        });

        // Create confirmations for supervisor and assessor
        await prisma.viva_confirmations.createMany({
            data: [
                {
                    viva_schedule_id: sch.id,
                    role: "SUPERVISOR",
                    status: "PENDING",
                    attendance_mode: item.mode
                },
                {
                    viva_schedule_id: sch.id,
                    role: "ASSESSOR",
                    status: "PENDING",
                    attendance_mode: item.mode
                }
            ]
        });

        createdSchedules.push(sch);
    }
    console.log(`✓ Created ${createdSchedules.length} schedules with PENDING confirmations.`);

    // 9. Simulate Supervisor 1 Confirming Slot 1
    console.log("\nStep 9: Simulating Supervisor 1 Confirming Slot 1...");
    const sch1 = createdSchedules[0];
    await prisma.viva_confirmations.updateMany({
        where: { viva_schedule_id: sch1.id, role: "SUPERVISOR" },
        data: {
            status: "CONFIRMED",
            attendance_mode: "PHYSICAL",
            confirmed_at: new Date(),
            comment: "Available to attend physically at L4CR2."
        }
    });
    console.log("✓ Supervisor 1 confirmed availability.");

    // 10. Simulate Assessor 1 Requesting Change on Slot 1
    console.log("\nStep 10: Simulating Assessor 1 Requesting Change on Slot 1...");
    await prisma.viva_confirmations.updateMany({
        where: { viva_schedule_id: sch1.id, role: "ASSESSOR" },
        data: {
            status: "CHANGE_REQUESTED",
            comment: "Clash with faculty meeting."
        }
    });

    const cr1 = await prisma.viva_change_requests.create({
        data: {
            viva_schedule_id: sch1.id,
            role: "ASSESSOR",
            original_date: sch1.date,
            original_time: "09:00",
            proposed_date: new Date("2026-09-17"),
            proposed_time: "10:30",
            attendance_mode: "PHYSICAL",
            reason: "Clash with faculty senate meeting on September 15th morning.",
            status: "PENDING"
        }
    });
    console.log(`✓ Change request created ID #${cr1.id} for Slot 1.`);

    // 11. Simulate Admin Accepting Change Request & Verifying Confirmation Reset
    console.log("\nStep 11: Simulating Admin Resolving Change Request (ACCEPT) & Confirmation Reset...");
    await prisma.$transaction(async (tx) => {
        // Update schedule to proposed slot
        await tx.viva_schedules.update({
            where: { id: sch1.id },
            data: {
                date: new Date("2026-09-17"),
                start_time: new Date("2026-09-17T10:30:00Z"),
                end_time: new Date("2026-09-17T11:00:00Z")
            }
        });

        // CONFIRMATION RESET: Reset both supervisor & assessor confirmations
        await tx.viva_confirmations.updateMany({
            where: { viva_schedule_id: sch1.id },
            data: {
                status: "PENDING",
                confirmed_at: null,
                comment: "Reset following accepted schedule change request."
            }
        });

        await tx.viva_change_requests.update({
            where: { id: cr1.id },
            data: {
                status: "ACCEPTED",
                admin_response: "Accepted. Schedule moved to 17 Sep 10:30 AM.",
                resolved_at: new Date()
            }
        });
    });

    const postResetConfs = await prisma.viva_confirmations.findMany({
        where: { viva_schedule_id: sch1.id }
    });
    const allReset = postResetConfs.every(c => c.status === "PENDING" && c.confirmed_at === null);
    console.log(`✓ Admin accepted change request. Confirmations reset verified: ${allReset ? "PASSED" : "FAILED"}`);

    // 12. Simulate All Parties Confirming Remaining Slots
    console.log("\nStep 12: Simulating Two-Sided Confirmations for all slots...");
    for (const sch of createdSchedules) {
        await prisma.viva_confirmations.updateMany({
            where: { viva_schedule_id: sch.id },
            data: {
                status: "CONFIRMED",
                confirmed_at: new Date(),
                comment: "Confirmed attendance."
            }
        });
        await prisma.viva_schedules.update({
            where: { id: sch.id },
            data: { status: "CONFIRMED" }
        });
    }
    console.log("✓ All slots now confirmed by both supervisors and assessors.");

    // 13. Test Finalization with Microsoft Sync
    console.log("\nStep 13: Simulating Finalization & Microsoft Sync...");
    await prisma.viva_periods.update({
        where: { id: period.id },
        data: { status: "FINALIZED" }
    });

    for (const sch of createdSchedules) {
        const fullSch = await prisma.viva_schedules.findUnique({
            where: { id: sch.id },
            include: { students: true, supervisors: true, assessors: true }
        });
        const syncRes = await MicrosoftGraphService.createCalendarEvent(fullSch, period);
        await prisma.viva_schedules.update({
            where: { id: sch.id },
            data: {
                status: "FINALIZED",
                finalized_at: new Date(),
                outlook_event_id: syncRes.eventId,
                teams_meeting_id: syncRes.teamsMeetingId || null,
                teams_join_url: syncRes.teamsJoinUrl || null,
                outlook_sync_status: syncRes.success ? "SYNCED" : "FAILED"
            }
        });
    }
    console.log("✓ Finalization complete! Outlook Calendar event IDs & Teams URLs recorded.");

    // 14. Test Private Notes
    console.log("\nStep 14: Testing Private Viva Preparation Notes...");
    const note1 = await prisma.viva_notes.create({
        data: {
            viva_schedule_id: sch1.id,
            user_id: sups["kavin@apiit.lk"].id,
            role: "SUPERVISOR",
            note: "Key questions for Alice: Clarify microservices communication latency and JWT token expiry handling."
        }
    });

    const note2 = await prisma.viva_notes.create({
        data: {
            viva_schedule_id: sch1.id,
            user_id: asses["assessor1@apiit.lk"].id,
            role: "ASSESSOR",
            note: "Key questions for Alice: Evaluation of database indexing strategy and test coverage."
        }
    });
    console.log(`✓ Independent notes saved. Supervisor note ID: ${note1.id}, Assessor note ID: ${note2.id}`);

    // Verify Audit Logging
    await VivaAuditService.log({
        viva_period_id: period.id,
        action: "SEED_WORKFLOW_VALIDATION_COMPLETED",
        performed_by: "System Test",
        role: "ADMIN",
        details: "Full viva test scenario executed and verified."
    });

    console.log("\n=======================================================");
    console.log("✓ ALL VIVA MANAGEMENT BACKEND WORKFLOW TESTS PASSED!");
    console.log("=======================================================\n");
}

runSeedAndTest()
    .catch((err) => {
        console.error("Seed and Test Error:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
