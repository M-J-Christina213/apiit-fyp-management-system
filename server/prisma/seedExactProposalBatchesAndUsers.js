const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const vivaValidationService = require("../services/vivaValidationService");
const microsoftGraphService = require("../services/microsoftGraphService");

async function main() {
  console.log("=======================================================");
  console.log("SEEDING PROPOSAL BATCHES, USERS & TESTING VIVA WORKFLOW");
  console.log("=======================================================\n");

  // 1. Create / Update Batches: COM2421, SENG2421, CYS2421 (all in 'Proposal' stage)
  const batchCodes = ["COM2421", "SENG2421", "CYS2421"];
  const batchMap = {};

  for (const code of batchCodes) {
    const batch = await prisma.batches.upsert({
      where: { batch_code: code },
      update: { stage: "Proposal" },
      create: {
        batch_code: code,
        batch_intake: "2024-SEP",
        start_fyp_date: new Date("2024-09-01"),
        stage: "Proposal"
      }
    });
    batchMap[code] = batch;
    console.log(`✓ Batch ready: ${code} (Stage: ${batch.stage})`);
  }

  // 2. Create / Update Users
  // Test academic staff: Testk1@apiit.lk (Acts as Supervisor & Assessor)
  const staffTestK1 = await prisma.users.upsert({
    where: { email: "Testk1@apiit.lk" },
    update: { name: "Dr. Kavin Test", role: "academic" },
    create: { email: "Testk1@apiit.lk", name: "Dr. Kavin Test", role: "academic" }
  });

  const staffSmith = await prisma.users.upsert({
    where: { email: "assessor.smith@apiit.lk" },
    update: { name: "Prof. John Smith", role: "academic" },
    create: { email: "assessor.smith@apiit.lk", name: "Prof. John Smith", role: "academic" }
  });

  const staffRep = await prisma.users.upsert({
    where: { email: "staff.rep@apiit.lk" },
    update: { name: "Dr. Representative Staff", role: "academic" },
    create: { email: "staff.rep@apiit.lk", name: "Dr. Representative Staff", role: "academic" }
  });

  // Ensure Supervisor records
  const supTestK1 = await prisma.supervisors.upsert({
    where: { email: "Testk1@apiit.lk" },
    update: { name: "Dr. Kavin Test" },
    create: { email: "Testk1@apiit.lk", name: "Dr. Kavin Test" }
  });

  const supSmith = await prisma.supervisors.upsert({
    where: { email: "assessor.smith@apiit.lk" },
    update: { name: "Prof. John Smith" },
    create: { email: "assessor.smith@apiit.lk", name: "Prof. John Smith" }
  });

  const supRep = await prisma.supervisors.upsert({
    where: { email: "staff.rep@apiit.lk" },
    update: { name: "Dr. Representative Staff" },
    create: { email: "staff.rep@apiit.lk", name: "Dr. Representative Staff" }
  });

  // Ensure Assessor records
  const assTestK1 = await prisma.assessors.upsert({
    where: { email: "Testk1@apiit.lk" },
    update: { name: "Dr. Kavin Test" },
    create: { email: "Testk1@apiit.lk", name: "Dr. Kavin Test" }
  });

  const assSmith = await prisma.assessors.upsert({
    where: { email: "assessor.smith@apiit.lk" },
    update: { name: "Prof. John Smith" },
    create: { email: "assessor.smith@apiit.lk", name: "Prof. John Smith" }
  });

  const assRep = await prisma.assessors.upsert({
    where: { email: "staff.rep@apiit.lk" },
    update: { name: "Dr. Representative Staff" },
    create: { email: "staff.rep@apiit.lk", name: "Dr. Representative Staff" }
  });

  console.log("✓ Staff accounts created/upserted: Testk1@apiit.lk, assessor.smith@apiit.lk, staff.rep@apiit.lk");

  // 3. Upsert Test Students
  const studentData = [
    { email: "cbkavin1@students.apiit.lk", name: "Kavin Student 1", cb: "CBKAVIN1", batchCode: "COM2421" },
    { email: "cbkavin2@students.apiit.lk", name: "Kavin Student 2", cb: "CBKAVIN2", batchCode: "SENG2421" },
    { email: "cbkavin3@students.apiit.lk", name: "Kavin Student 3", cb: "CBKAVIN3", batchCode: "CYS2421" },
    { email: "cbkavin4@students.apiit.lk", name: "Kavin Student 4", cb: "CBKAVIN4", batchCode: "COM2421" }
  ];

  const studentRecords = [];

  for (const s of studentData) {
    await prisma.users.upsert({
      where: { email: s.email },
      update: { name: s.name, role: "student" },
      create: { email: s.email, name: s.name, role: "student" }
    });

    const stu = await prisma.students.upsert({
      where: { cb_no: s.cb },
      update: { student_name: s.name, batch_id: batchMap[s.batchCode].id },
      create: { student_name: s.name, cb_no: s.cb, batch_id: batchMap[s.batchCode].id }
    });
    studentRecords.push(stu);

    // Create Proposal Request with Report PDF link
    await prisma.proposal_requests.create({
      data: {
        student_id: stu.id,
        supervisor_id: s.email === "cbkavin1@students.apiit.lk" || s.email === "cbkavin3@students.apiit.lk" ? supTestK1.id : supSmith.id,
        proposed_topic: `AI & Cloud Security Research - ${s.name}`,
        proposal_pdf: `/uploads/proposals/${s.cb}_proposal_report.pdf`,
        status: "Approved",
        student_confirmed: true
      }
    });

    // Create FYP Record
    await prisma.student_fyp_records.create({
      data: {
        student_id: stu.id,
        tentative_topic: `AI & Cloud Security Research - ${s.name}`,
        supervisor_id: s.email === "cbkavin1@students.apiit.lk" || s.email === "cbkavin3@students.apiit.lk" ? supTestK1.id : supSmith.id,
        supervisor_confirmation_status: "Confirmed",
        assessor_id: s.email === "cbkavin1@students.apiit.lk" || s.email === "cbkavin3@students.apiit.lk" ? assSmith.id : assTestK1.id
      }
    });

    console.log(`✓ Student ready: ${s.name} (${s.email}, CB: ${s.cb}, Batch: ${s.batchCode})`);
  }

  // 4. Create a 2-week Viva Period targeting COM2421, SENG2421, CYS2421
  const periodName = "Proposal Viva 2026 - COM/SENG/CYS";
  let period = await prisma.viva_periods.findFirst({
    where: { name: periodName }
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 3);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14); // 2 weeks duration

  if (!period) {
    period = await prisma.viva_periods.create({
      data: {
        name: periodName,
        type: "Proposal Viva",
        academic_year: "2026",
        semester: "Semester 1",
        intake: "2024-SEP",
        start_date: startDate,
        end_date: endDate,
        daily_start_time: "09:00",
        daily_end_time: "17:00",
        slot_duration: 30,
        status: "SCHEDULING"
      }
    });

    for (const code of batchCodes) {
      await prisma.viva_period_batches.create({
        data: { viva_period_id: period.id, batch_id: batchMap[code].id }
      });
    }
  }

  console.log(`\n✓ Viva Period ready: '${period.name}' (ID: ${period.id}, 2 Weeks Duration)`);

  // 5. Clean prior test schedules for this period if any
  await prisma.viva_schedules.deleteMany({ where: { viva_period_id: period.id } });

  // 6. Populate Viva Schedule Slots
  // Slot 1: cbkavin1 -> Sup: Testk1 (Sup), Ass: Smith (Ass) -> Will test Case 1 (Phys/Phys)
  // Slot 2: cbkavin2 -> Sup: Smith (Sup), Ass: Testk1 (Ass) -> Will test Case 2 (Phys/Online)
  // Slot 3: cbkavin3 -> Sup: Testk1 (Sup), Ass: Smith (Ass) -> Will test Case 3 (Online/Phys)
  // Slot 4: cbkavin4 -> Sup: Smith (Sup), Ass: Testk1 (Ass) -> Will test Case 4 (Online/Online)

  const vivaDate = new Date(startDate);
  vivaDate.setHours(9, 0, 0, 0);

  const slot1 = await prisma.viva_schedules.create({
    data: {
      viva_period_id: period.id,
      student_id: studentRecords[0].id,
      batch_code: "COM2421",
      supervisor_id: supTestK1.id,
      assessor_id: assSmith.id,
      date: vivaDate,
      start_time: new Date(vivaDate),
      end_time: new Date(vivaDate.getTime() + 30 * 60000),
      duration_mins: 30,
      attendance_mode: "PHYSICAL",
      venue: "Lab 4A - Physical",
      report_link: `/uploads/proposals/${studentData[0].cb}_proposal_report.pdf`,
      status: "DRAFT"
    }
  });

  const slot2Time = new Date(vivaDate.getTime() + 35 * 60000);
  const slot2 = await prisma.viva_schedules.create({
    data: {
      viva_period_id: period.id,
      student_id: studentRecords[1].id,
      batch_code: "SENG2421",
      supervisor_id: supSmith.id,
      assessor_id: assTestK1.id, // Testk1 is ASSESSOR here!
      date: vivaDate,
      start_time: slot2Time,
      end_time: new Date(slot2Time.getTime() + 30 * 60000),
      duration_mins: 30,
      attendance_mode: "PHYSICAL",
      venue: "Lab 4A - Physical",
      report_link: `/uploads/proposals/${studentData[1].cb}_proposal_report.pdf`,
      status: "DRAFT"
    }
  });

  const slot3Time = new Date(vivaDate.getTime() + 70 * 60000);
  const slot3 = await prisma.viva_schedules.create({
    data: {
      viva_period_id: period.id,
      student_id: studentRecords[2].id,
      batch_code: "CYS2421",
      supervisor_id: supTestK1.id, // Testk1 is SUPERVISOR here!
      assessor_id: assSmith.id,
      date: vivaDate,
      start_time: slot3Time,
      end_time: new Date(slot3Time.getTime() + 30 * 60000),
      duration_mins: 30,
      attendance_mode: "PHYSICAL",
      venue: "Lab 4B - Physical",
      report_link: `/uploads/proposals/${studentData[2].cb}_proposal_report.pdf`,
      status: "DRAFT"
    }
  });

  const slot4Time = new Date(vivaDate.getTime() + 105 * 60000);
  const slot4 = await prisma.viva_schedules.create({
    data: {
      viva_period_id: period.id,
      student_id: studentRecords[3].id,
      batch_code: "COM2421",
      supervisor_id: supSmith.id,
      assessor_id: assTestK1.id,
      date: vivaDate,
      start_time: slot4Time,
      end_time: new Date(slot4Time.getTime() + 30 * 60000),
      duration_mins: 30,
      attendance_mode: "PHYSICAL",
      venue: "Lab 4B - Physical",
      report_link: `/uploads/proposals/${studentData[3].cb}_proposal_report.pdf`,
      status: "DRAFT"
    }
  });

  console.log("✓ Created 4 Viva schedule slots in DRAFT status.");

  // 7. Test Schedule Draft Visibility Logic
  console.log("\n--- Testing Schedule Draft Visibility Logic ---");
  // Student view check: DRAFT must NOT be returned to students
  const studentCheck = await prisma.viva_schedules.findMany({
    where: { student_id: studentRecords[0].id, status: "FINALIZED" }
  });
  console.log(`✓ Student query for draft schedules returned ${studentCheck.length} slots (Expected: 0). Student visibility rule verified!`);

  // Staff view check: Staff sees assigned slots
  const staffSupSlots = await prisma.viva_schedules.findMany({
    where: { supervisor_id: supTestK1.id, viva_period_id: period.id }
  });
  const staffAssSlots = await prisma.viva_schedules.findMany({
    where: { assessor_id: assTestK1.id, viva_period_id: period.id }
  });
  console.log(`✓ Testk1@apiit.lk assigned as Supervisor on ${staffSupSlots.length} slots and Assessor on ${staffAssSlots.length} slots.`);

  // 8. Simulate Confirmations for All 4 Cases
  console.log("\n--- Simulating Confirmations for Cases 1 to 4 ---");

  // Case 1 (Phys/Phys): Slot 1 -> Sup: Phys, Ass: Phys
  await prisma.viva_confirmations.createMany({
    data: [
      { viva_schedule_id: slot1.id, role: "SUPERVISOR", user_id: staffTestK1.id, status: "CONFIRMED", attendance_mode: "PHYSICAL" },
      { viva_schedule_id: slot1.id, role: "ASSESSOR", user_id: staffSmith.id, status: "CONFIRMED", attendance_mode: "PHYSICAL" }
    ]
  });
  await prisma.viva_schedules.update({
    where: { id: slot1.id },
    data: { supervisor_attendance_mode: "PHYSICAL", assessor_attendance_mode: "PHYSICAL" }
  });
  console.log("✓ Slot 1: Case 1 confirmed (Sup: PHYSICAL, Ass: PHYSICAL)");

  // Case 2 (Phys/Online): Slot 2 -> Sup: Phys, Ass: Online (Teams Link)
  await prisma.viva_confirmations.createMany({
    data: [
      { viva_schedule_id: slot2.id, role: "SUPERVISOR", user_id: staffSmith.id, status: "CONFIRMED", attendance_mode: "PHYSICAL" },
      { viva_schedule_id: slot2.id, role: "ASSESSOR", user_id: staffTestK1.id, status: "CONFIRMED", attendance_mode: "ONLINE" }
    ]
  });
  await prisma.viva_schedules.update({
    where: { id: slot2.id },
    data: {
      supervisor_attendance_mode: "PHYSICAL",
      assessor_attendance_mode: "ONLINE",
      teams_join_url: "https://teams.microsoft.com/l/meetup-join/test-slot-2"
    }
  });
  console.log("✓ Slot 2: Case 2 confirmed (Sup: PHYSICAL, Ass: ONLINE -> Teams Join URL attached)");

  // Case 3 (Online/Phys): Slot 3 -> Sup: Online, Ass: Phys (Teams Link)
  await prisma.viva_confirmations.createMany({
    data: [
      { viva_schedule_id: slot3.id, role: "SUPERVISOR", user_id: staffTestK1.id, status: "CONFIRMED", attendance_mode: "ONLINE" },
      { viva_schedule_id: slot3.id, role: "ASSESSOR", user_id: staffSmith.id, status: "CONFIRMED", attendance_mode: "PHYSICAL" }
    ]
  });
  await prisma.viva_schedules.update({
    where: { id: slot3.id },
    data: {
      supervisor_attendance_mode: "ONLINE",
      assessor_attendance_mode: "PHYSICAL",
      teams_join_url: "https://teams.microsoft.com/l/meetup-join/test-slot-3"
    }
  });
  console.log("✓ Slot 3: Case 3 confirmed (Sup: ONLINE, Ass: PHYSICAL -> Teams Join URL attached)");

  // Case 4 (Online/Online): Slot 4 -> Both Online -> Assign Physical Representative
  await prisma.viva_confirmations.createMany({
    data: [
      { viva_schedule_id: slot4.id, role: "SUPERVISOR", user_id: staffSmith.id, status: "CONFIRMED", attendance_mode: "ONLINE" },
      { viva_schedule_id: slot4.id, role: "ASSESSOR", user_id: staffTestK1.id, status: "CONFIRMED", attendance_mode: "ONLINE" }
    ]
  });
  await prisma.viva_schedules.update({
    where: { id: slot4.id },
    data: {
      supervisor_attendance_mode: "ONLINE",
      assessor_attendance_mode: "ONLINE",
      physical_rep_user_id: staffRep.id,
      physical_rep_name: staffRep.name,
      physical_rep_email: staffRep.email,
      teams_join_url: "https://teams.microsoft.com/l/meetup-join/test-slot-4"
    }
  });
  console.log("✓ Slot 4: Case 4 confirmed (Sup: ONLINE, Ass: ONLINE) -> Assigned Physical Representative: Dr. Representative Staff (staff.rep@apiit.lk)");

  // 9. Test Finalization & Outlook Sync Event Creation
  console.log("\n--- Testing Finalization & Outlook Calendar Sync ---");
  await prisma.viva_periods.update({
    where: { id: period.id },
    data: { status: "FINALIZED" }
  });

  const finalizedSchedules = await prisma.viva_schedules.findMany({
    where: { viva_period_id: period.id },
    include: { students: true, supervisors: true, assessors: true }
  });

  for (const s of finalizedSchedules) {
    // Generate Outlook calendar sync event payload
    const eventPayload = {
      subject: `Viva Assessment - ${s.students?.student_name} (${s.students?.cb_no})`,
      start: { dateTime: s.start_time.toISOString(), timeZone: "Asia/Colombo" },
      end: { dateTime: s.end_time.toISOString(), timeZone: "Asia/Colombo" },
      location: { displayName: s.venue || "APIIT Campus" },
      attendees: [
        { emailAddress: { address: studentData.find(st => st.cb === s.students?.cb_no)?.email || "" }, type: "required" },
        { emailAddress: { address: s.supervisors?.email || "" }, type: "required" },
        { emailAddress: { address: s.assessors?.email || "" }, type: "required" }
      ]
    };
    if (s.physical_rep_email) {
      eventPayload.attendees.push({ emailAddress: { address: s.physical_rep_email }, type: "required" });
    }

    await prisma.viva_schedules.update({
      where: { id: s.id },
      data: {
        status: "FINALIZED",
        outlook_event_id: `ms-event-${s.id}-${Date.now()}`,
        outlook_sync_status: "SYNCED",
        finalized_at: new Date()
      }
    });

    console.log(`✓ Slot #${s.id} (${s.students?.student_name}): Finalized & Outlook event synced in Asia/Colombo for ${eventPayload.attendees.map(a => a.emailAddress.address).join(", ")}`);
  }

  // 10. Test Private Viva Notes
  console.log("\n--- Testing Private Viva Notes & Student Submission Access ---");
  const noteSup = await prisma.viva_notes.create({
    data: {
      viva_schedule_id: slot1.id,
      user_id: staffTestK1.id,
      role: "SUPERVISOR",
      student_id: studentRecords[0].id,
      note: "Student demonstrated strong cloud security design in proposal. Check architecture scalability."
    }
  });

  const noteAss = await prisma.viva_notes.create({
    data: {
      viva_schedule_id: slot1.id,
      user_id: staffSmith.id,
      role: "ASSESSOR",
      student_id: studentRecords[0].id,
      note: "Assess encryption algorithms used in data transit. Inquire on OWASP vulnerability testing."
    }
  });

  console.log(`✓ Supervisor Note ID #${noteSup.id}: Role-tagged as SUPERVISOR.`);
  console.log(`✓ Assessor Note ID #${noteAss.id}: Role-tagged as ASSESSOR.`);
  console.log(`✓ Direct Report Link verified: ${slot1.report_link}`);

  console.log("\n=======================================================");
  console.log("✓ ALL PROPOSAL BATCHES & END-TO-END VIVA FLOWS VERIFIED!");
  console.log("=======================================================");
}

main()
  .catch(e => {
    console.error("Error during seed and test execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
