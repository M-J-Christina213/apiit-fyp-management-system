const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class NotificationService {
    static async create({ userId, title, message }) {
        if (!userId) return null;
        try {
            return await prisma.notifications.create({
                data: {
                    user_id: Number(userId),
                    title,
                    message,
                    is_read: false
                }
            });
        } catch (err) {
            console.error("Error creating notification in service:", err);
            return null;
        }
    }

    static async notifyStudent(studentId, title, message) {
        try {
            const student = await prisma.students.findUnique({
                where: { id: Number(studentId) }
            });
            if (!student) return null;
            const user = await prisma.users.findFirst({
                where: {
                    email: {
                        startsWith: student.cb_no,
                        mode: 'insensitive'
                    }
                }
            });
            if (user) {
                return await this.create({ userId: user.id, title, message });
            }
        } catch (err) {
            console.error(`Error notifying student ${studentId}:`, err);
        }
        return null;
    }

    static async notifySupervisor(supervisorId, title, message) {
        try {
            const supervisor = await prisma.supervisors.findUnique({
                where: { id: Number(supervisorId) }
            });
            if (!supervisor || !supervisor.email) return null;
            const user = await prisma.users.findUnique({
                where: { email: supervisor.email }
            });
            if (user) {
                return await this.create({ userId: user.id, title, message });
            }
        } catch (err) {
            console.error(`Error notifying supervisor ${supervisorId}:`, err);
        }
        return null;
    }

    static async notifyAssessor(assessorId, title, message) {
        try {
            const assessor = await prisma.assessors.findUnique({
                where: { id: Number(assessorId) }
            });
            if (!assessor || !assessor.email) return null;
            const user = await prisma.users.findUnique({
                where: { email: assessor.email }
            });
            if (user) {
                return await this.create({ userId: user.id, title, message });
            }
        } catch (err) {
            console.error(`Error notifying assessor ${assessorId}:`, err);
        }
        return null;
    }

    static async notifyBatch(batchId, title, message) {
        try {
            const students = await prisma.students.findMany({
                where: { batch_id: Number(batchId) }
            });
            const cbNos = students.map(s => s.cb_no.toUpperCase());
            const studentUsers = await prisma.users.findMany({
                where: { role: "student" }
            });
            const matchingUsers = studentUsers.filter(u => {
                const cb = u.email.split("@")[0].toUpperCase();
                return cbNos.includes(cb);
            });
            if (matchingUsers.length > 0) {
                await prisma.notifications.createMany({
                    data: matchingUsers.map(user => ({
                        user_id: user.id,
                        title,
                        message,
                        is_read: false
                    }))
                });
            }
        } catch (err) {
            console.error(`Error notifying batch ${batchId}:`, err);
        }
    }

    static async notifyAllStudents(title, message) {
        try {
            const studentUsers = await prisma.users.findMany({
                where: { role: "student" }
            });
            if (studentUsers.length > 0) {
                await prisma.notifications.createMany({
                    data: studentUsers.map(user => ({
                        user_id: user.id,
                        title,
                        message,
                        is_read: false
                    }))
                });
            }
        } catch (err) {
            console.error("Error notifying all students:", err);
        }
    }
}

module.exports = NotificationService;
