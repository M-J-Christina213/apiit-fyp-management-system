const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

async function generateSampleExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Viva Schedule");

  worksheet.columns = [
    { header: "Batch Code", key: "batch_code", width: 15 },
    { header: "Student Name", key: "student_name", width: 25 },
    { header: "CB No", key: "cb_no", width: 15 },
    { header: "Supervisor", key: "supervisor", width: 25 },
    { header: "Assessor", key: "assessor", width: 25 },
    { header: "Proposed Date", key: "date", width: 15 },
    { header: "Time", key: "time", width: 12 },
    { header: "Venue", key: "venue", width: 18 }
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" } // Indigo-600
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  const rows = [
    {
      batch_code: "COM2421",
      student_name: "Kavin Student 1",
      cb_no: "CB001001",
      supervisor: "Testk1@apiit.lk",
      assessor: "assessor.smith@apiit.lk",
      date: "2026-09-20",
      time: "09:00",
      venue: "Lab 4A - Physical"
    },
    {
      batch_code: "SENG2421",
      student_name: "Kavin Student 2",
      cb_no: "CB001002",
      supervisor: "assessor.smith@apiit.lk",
      assessor: "Testk1@apiit.lk",
      date: "2026-09-20",
      time: "09:35",
      venue: "Lab 4A - Physical"
    },
    {
      batch_code: "CYS2421",
      student_name: "Kavin Student 3",
      cb_no: "CB001003",
      supervisor: "Testk1@apiit.lk",
      assessor: "assessor.smith@apiit.lk",
      date: "2026-09-20",
      time: "10:10",
      venue: "Lab 4B - Physical"
    },
    {
      batch_code: "COM2421",
      student_name: "Kavin Student 4",
      cb_no: "CB001004",
      supervisor: "assessor.smith@apiit.lk",
      assessor: "Testk1@apiit.lk",
      date: "2026-09-20",
      time: "10:45",
      venue: "Lab 4B - Physical"
    }
  ];

  rows.forEach((r, idx) => {
    const row = worksheet.addRow(r);
    row.alignment = { vertical: "middle", horizontal: "left" };
    row.height = 20;
    if (idx % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" }
      };
    }
  });

  const publicDir = path.join(__dirname, "../public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outPath = path.join(publicDir, "sample_proposal_viva_schedule.xlsx");
  await workbook.xlsx.writeFile(outPath);
  console.log(`✓ Sample Excel spreadsheet generated successfully at: ${outPath}`);
}

generateSampleExcel().catch(console.error);
