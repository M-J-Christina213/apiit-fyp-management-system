const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ======================================================
// CENTRALLY DEFINED REMINDER INTERVALS
// Only intervals whose daysBeforeDeadline is reached get sent.
// ======================================================
const REMINDER_INTERVALS = [
    { key: "4_WEEKS", daysBeforeDeadline: 28, label: "4 weeks" },
    { key: "3_WEEKS", daysBeforeDeadline: 21, label: "3 weeks" },
    { key: "2_WEEKS", daysBeforeDeadline: 14, label: "2 weeks" },
    { key: "7_DAYS",  daysBeforeDeadline: 7,  label: "7 days"  },
    { key: "5_DAYS",  daysBeforeDeadline: 5,  label: "5 days"  },
    { key: "1_DAY",   daysBeforeDeadline: 1,  label: "1 day"   },
    { key: "TODAY",   daysBeforeDeadline: 0,  label: "today"   },
];

/**
 * Check a student's milestones and send any due reminders.
 * Called when a student loads their dashboard.
 * @param {number} studentId - internal DB id
 * @param {number} userId    - users.id for notifications table
 */
async function checkAndSendReminders(studentId, userId) {
    if (!studentId || !userId) return;

    try {
        const student = await prisma.students.findUnique({ where: { id: studentId } });
        if (!student?.batch_id) return;

        const milestones = await prisma.milestones.findMany({
            where: { batch_id: student.batch_id },
            orderBy: [{ order_index: "asc" }, { deadline: "asc" }]
        });

        const now = new Date();

        for (const milestone of milestones) {
            // Skip milestones that are already submitted/graded
            const statusRecord = await prisma.student_milestone_status.findUnique({
                where: {
                    student_id_milestone_id: {
                        student_id: studentId,
                        milestone_id: milestone.id
                    }
                }
            });
            if (statusRecord?.status === "Submitted" || statusRecord?.status === "Graded") {
                continue;
            }

            const deadlineDate = new Date(milestone.deadline);
            // Skip milestones that are in the past (overdue) — don't spam after deadline
            if (deadlineDate < now) continue;

            const diffMs = deadlineDate - now;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            for (const interval of REMINDER_INTERVALS) {
                // Check if we are at or past this interval's trigger point
                if (diffDays > interval.daysBeforeDeadline) continue;

                // Check if already sent
                const alreadySent = await prisma.sent_reminders.findUnique({
                    where: {
                        student_id_milestone_id_reminder_type: {
                            student_id: studentId,
                            milestone_id: milestone.id,
                            reminder_type: interval.key
                        }
                    }
                });
                if (alreadySent) continue;

                // Compose notification message
                const deadlineStr = deadlineDate.toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric"
                });
                const timeStr = deadlineDate.toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit"
                });

                let message;
                if (interval.key === "TODAY") {
                    message = `📅 Reminder: "${milestone.name}" is due TODAY at ${timeStr}.`;
                } else if (interval.key === "1_DAY") {
                    message = `⏰ Reminder: "${milestone.name}" is due tomorrow at ${timeStr}.`;
                } else {
                    message = `🔔 Upcoming submission: "${milestone.name}" is due in ${interval.label} on ${deadlineStr} at ${timeStr}.`;
                }

                // Create notification
                await prisma.notifications.create({
                    data: {
                        user_id: userId,
                        title: `FYP Milestone Reminder`,
                        message,
                        is_read: false
                    }
                });

                // Mark as sent (dedup)
                await prisma.sent_reminders.create({
                    data: {
                        student_id: studentId,
                        milestone_id: milestone.id,
                        reminder_type: interval.key
                    }
                });
            }
        }
    } catch (error) {
        // Non-fatal — just log; don't break the dashboard load
        console.error("[milestoneReminderService] Error checking reminders:", error.message);
    }
}

module.exports = { checkAndSendReminders, REMINDER_INTERVALS };
