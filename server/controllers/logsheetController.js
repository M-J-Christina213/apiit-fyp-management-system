const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const resolveStudentDbId = async (studentIdOrCbNo) => {
    if (!studentIdOrCbNo) return null;
    const parsed = Number(studentIdOrCbNo);
    if (!isNaN(parsed)) {
        return parsed;
    }
    const student = await prisma.students.findUnique({
        where: { cb_no: String(studentIdOrCbNo) }
    });
    return student ? student.id : null;
};

const getSemesterFromStage = (stage) => {
    switch (stage) {
        case "Proposal":
            return "Semester 1";
        case "Midpoint":
            return "Semester 2";
        case "Final":
            return "Semester 3";
        default:
            return "Semester 1";
    }
};

const createLogsheet = async (req, res) => {
    try {
        const { student_id, meeting_date, venue } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "Supporting logsheet file is mandatory." });
        }

        if (!meeting_date) {
            return res.status(400).json({ message: "Meeting date is required." });
        }

        const studentDbId = await resolveStudentDbId(student_id);
        if (!studentDbId) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Find confirmed supervisor from student_fyp_records
        const fypRecord = await prisma.student_fyp_records.findFirst({
            where: {
                student_id: studentDbId,
                supervisor_confirmation_status: { in: ["Approved", "Confirmed", "Allocated"] }
            }
        });

        const supervisorId = fypRecord ? fypRecord.supervisor_id : null;

        // Get student's batch stage to derive semester
        const student = await prisma.students.findUnique({
            where: { id: studentDbId },
            include: { batches: true }
        });

        const stage = student?.batches?.stage || "Proposal";
        const semester = getSemesterFromStage(stage);

        const logsheet = await prisma.logsheets.create({
            data: {
                student_id: studentDbId,
                supervisor_id: supervisorId,
                meeting_date: new Date(meeting_date),
                venue: venue || null,
                file_name: file.originalname,
                file_path: file.filename,
                file_type: file.mimetype,
                file_size: (file.size / 1024).toFixed(2) + " KB",
                status: "Pending Review",
                semester
            },
            include: {
                supervisors: true
            }
        });

        res.status(201).json({
            id: logsheet.id,
            meeting_date: logsheet.meeting_date,
            venue: logsheet.venue,
            status: logsheet.status,
            semester: logsheet.semester,
            supervisor_name: logsheet.supervisors
                ? `${logsheet.supervisors.title || ""} ${logsheet.supervisors.name}`.trim()
                : "N/A",
            file_name: logsheet.file_name,
            file_path: logsheet.file_path
        });

    } catch (err) {
        console.error("Failed to submit logsheet:", err);
        res.status(500).json({ message: "Failed to submit logsheet. Please try again." });
    }
};

const getStudentLogsheets = async (req, res) => {
    try {
        const { id } = req.params;
        const studentDbId = await resolveStudentDbId(id);

        if (!studentDbId) {
            return res.json([]);
        }

        const logsheetsList = await prisma.logsheets.findMany({
            where: { student_id: studentDbId },
            orderBy: { meeting_date: "desc" },
            include: {
                supervisors: true
            }
        });

        const formatted = logsheetsList.map(l => ({
            id: l.id,
            meeting_date: l.meeting_date,
            venue: l.venue,
            status: l.status,
            semester: l.semester,
            supervisor_name: l.supervisors
                ? `${l.supervisors.title || ""} ${l.supervisors.name}`.trim()
                : "N/A",
            file_name: l.file_name,
            file_path: l.file_path
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Failed to fetch logsheets:", err);
        res.status(500).json({ message: "Failed to fetch logsheets." });
    }
};

module.exports = {
    createLogsheet,
    getStudentLogsheets
};
