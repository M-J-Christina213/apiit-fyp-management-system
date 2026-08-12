const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Viva Scheduling Seed...");

    // 1. Clear existing Viva data (optional, but good for clean testing)
    await prisma.viva_schedules.deleteMany({});
    await prisma.viva_availabilities.deleteMany({});
    await prisma.viva_periods.deleteMany({});

    // Create 3 Users for each role for testing (assuming users table exists, but let's check schema. If users are not required by FK, we might not need them, but they are. Let's create dummy users)
    // Wait, let's create the periods first.
    
    // We assume some users exist or we create them. The requirements state "Temporary test users may be used for development". 
    // Let's create users if they don't exist.
    
    // Create Students
    const students = [];
    for(let i=1; i<=3; i++) {
        let student = await prisma.students.findUnique({ where: { cb_no: `CB00${122+i}` } });
        if (!student) {
            student = await prisma.students.create({
                data: {
                    student_name: `Test Student ${i}`,
                    cb_no: `CB00${122+i}`
                }
            });
        }
        students.push(student);
    }

    // Create Supervisors
    const supervisors = [];
    for(let i=1; i<=2; i++) {
        let sup = await prisma.supervisors.findUnique({ where: { email: `supervisor${i}@test.com` } });
        if (!sup) {
            sup = await prisma.supervisors.create({
                data: {
                    name: `Test Supervisor ${i}`,
                    email: `supervisor${i}@test.com`
                }
            });
        }
        supervisors.push(sup);
    }

    // Create Assessors
    const assessors = [];
    for(let i=1; i<=2; i++) {
        let ass = await prisma.assessors.findUnique({ where: { email: `assessor${i}@test.com` } });
        if (!ass) {
            ass = await prisma.assessors.create({
                data: {
                    name: `Test Assessor ${i}`,
                    email: `assessor${i}@test.com`
                }
            });
        }
        assessors.push(ass);
    }

    // Create Periods
    const today = new Date();
    const addDays = (date, days) => {
        let d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };

    const propPeriod = await prisma.viva_periods.create({
        data: {
            type: "Proposal Viva",
            status: "Availability Collection", // Published
            availability_start: today,
            availability_end: addDays(today, 5),
            viva_start: addDays(today, 6),
            viva_end: addDays(today, 10),
        }
    });

    const midPeriod = await prisma.viva_periods.create({
        data: {
            type: "Midpoint Viva",
            status: "Draft",
            availability_start: addDays(today, 30),
            availability_end: addDays(today, 35),
            viva_start: addDays(today, 36),
            viva_end: addDays(today, 40),
        }
    });

    const finalPeriod = await prisma.viva_periods.create({
        data: {
            type: "Final Viva",
            status: "Draft",
            availability_start: addDays(today, 90),
            availability_end: addDays(today, 95),
            viva_start: addDays(today, 96),
            viva_end: addDays(today, 100),
        }
    });

    // Create Availabilities for Proposal Viva
    // Scenario 1: Student 1 has common availability with Supervisor 1 and Assessor 1
    // Student 1: 10:00 - 12:00
    // Supervisor 1: 10:00 - 14:00
    // Assessor 1: 10:30 - 13:00
    // Result should be 10:30 - 11:00

    const vivaDay1 = addDays(today, 7);
    const dateStr = vivaDay1.toISOString().split('T')[0];

    const createAvail = async (periodId, data) => {
        return await prisma.viva_availabilities.create({ data: { viva_period_id: periodId, ...data } });
    };

    const d = (time) => new Date(`${dateStr}T${time}:00Z`); // using UTC for simplicity in DB

    await createAvail(propPeriod.id, { student_id: students[0].id, date: vivaDay1, start_time: d('10:00'), end_time: d('12:00') });
    await createAvail(propPeriod.id, { supervisor_id: supervisors[0].id, date: vivaDay1, start_time: d('10:00'), end_time: d('14:00') });
    await createAvail(propPeriod.id, { assessor_id: assessors[0].id, date: vivaDay1, start_time: d('10:30'), end_time: d('13:00') });

    // Scenario 2: Student 2 has NO common availability
    await createAvail(propPeriod.id, { student_id: students[1].id, date: vivaDay1, start_time: d('08:00'), end_time: d('09:00') });
    await createAvail(propPeriod.id, { supervisor_id: supervisors[1].id, date: vivaDay1, start_time: d('10:00'), end_time: d('12:00') });
    await createAvail(propPeriod.id, { assessor_id: assessors[1].id, date: vivaDay1, start_time: d('10:00'), end_time: d('12:00') });

    // Scenario 3: Conflict Detection Test
    // Student 3 with Supervisor 1 and Assessor 1
    // Student 3: 10:00 - 12:00
    // If Student 1 gets 10:30-11:00, then Student 3 should get 11:00-11:30 or 10:00-10:30
    await createAvail(propPeriod.id, { student_id: students[2].id, date: vivaDay1, start_time: d('10:00'), end_time: d('12:00') });

    // Let's also create dummy assignments so the scheduler knows which student belongs to which supervisor/assessor.
    console.log("Seeding complete. Note: Ensure students have supervisors/assessors assigned in the student_fyp_records table for the auto-scheduler to pick them up.");
    
    // Check if we need to mock fyp_records
    await prisma.student_fyp_records.deleteMany({
        where: { student_id: { in: students.map(s => s.id) } }
    });

    const p1 = await prisma.student_fyp_records.create({
        data: {
            tentative_topic: "Project 1",
            student_id: students[0].id,
            supervisor_id: supervisors[0].id,
            assessor_id: assessors[0].id
        }
    });
    const p2 = await prisma.student_fyp_records.create({
        data: {
            tentative_topic: "Project 2",
            student_id: students[1].id,
            supervisor_id: supervisors[1].id,
            assessor_id: assessors[1].id
        }
    });
    const p3 = await prisma.student_fyp_records.create({
        data: {
            tentative_topic: "Project 3",
            student_id: students[2].id,
            supervisor_id: supervisors[0].id,
            assessor_id: assessors[0].id
        }
    });

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
