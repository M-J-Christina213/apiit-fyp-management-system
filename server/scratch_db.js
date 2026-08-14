const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  try {
    // 1. Find Christina
    const student = await prisma.students.findUnique({
      where: { cb_no: 'CB014416' },
      include: {
        batches: true,
        student_fyp_records: {
            include: {
                supervisors: true,
                assessors: true
            }
        }
      }
    });

    console.log("=== 1. CHRISTINA RECORD ===");
    if (!student) {
        console.log("Christina not found!");
    } else {
        console.log("ID:", student.id);
        console.log("Name:", student.student_name);
        console.log("Batch ID:", student.batch_id);
        console.log("Batch Code:", student.batches?.batch_code);
        
        if (student.student_fyp_records.length > 0) {
            const rec = student.student_fyp_records[0];
            console.log("Supervisor ID:", rec.supervisor_id);
            console.log("Supervisor Name:", rec.supervisors?.name);
            console.log("Supervisor Email:", rec.supervisors?.email);
            console.log("Assessor ID:", rec.assessor_id);
            console.log("Assessor Name:", rec.assessors?.name);
            console.log("Assessor Email:", rec.assessors?.email);
        } else {
            console.log("No student_fyp_records for Christina!");
        }
    }

    // 2. Find Anjali Silva in supervisors
    const anjaliSup = await prisma.supervisors.findUnique({
        where: { email: 'anjali.silva@apiit.lk' }
    });
    
    console.log("\n=== 2. ANJALI SUPERVISOR RECORD ===");
    if (anjaliSup) {
        console.log("Supervisor ID:", anjaliSup.id);
        console.log("Name:", anjaliSup.name);
        console.log("Email:", anjaliSup.email);
        
        const fypRecords = await prisma.student_fyp_records.findMany({
            where: { supervisor_id: anjaliSup.id }
        });
        console.log("FYP Records count for Anjali:", fypRecords.length);
    } else {
        console.log("Anjali Silva not found in supervisors table!");
    }

    // 3. Find Anjali Silva in assessors
    const anjaliAss = await prisma.assessors.findUnique({
        where: { email: 'anjali.silva@apiit.lk' }
    });
    
    console.log("\n=== 3. ANJALI ASSESSOR RECORD ===");
    if (anjaliAss) {
        console.log("Assessor ID:", anjaliAss.id);
        console.log("Name:", anjaliAss.name);
        console.log("Email:", anjaliAss.email);
        
        const fypRecords = await prisma.student_fyp_records.findMany({
            where: { assessor_id: anjaliAss.id }
        });
        console.log("FYP Records count for Anjali:", fypRecords.length);
    } else {
        console.log("Anjali Silva not found in assessors table!");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
