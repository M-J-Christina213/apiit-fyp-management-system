const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class VivaAuditService {
    /**
     * Log an action in the viva audit trail
     */
    static async log({
        viva_period_id = null,
        viva_schedule_id = null,
        action,
        performed_by = "System",
        role = "ADMIN",
        details = null
    }) {
        try {
            const detailStr = typeof details === "object" && details !== null 
                ? JSON.stringify(details) 
                : (details || null);

            return await prisma.viva_audit_logs.create({
                data: {
                    viva_period_id: viva_period_id ? parseInt(viva_period_id) : null,
                    viva_schedule_id: viva_schedule_id ? parseInt(viva_schedule_id) : null,
                    action,
                    performed_by,
                    role,
                    details: detailStr
                }
            });
        } catch (error) {
            console.error("VivaAuditService Error:", error.message);
            // Non-blocking: we do not want audit logging to block primary transactions
            return null;
        }
    }

    /**
     * Fetch audit logs for a specific Viva Period or Schedule
     */
    static async getLogs({ viva_period_id = null, viva_schedule_id = null, limit = 100 }) {
        try {
            const where = {};
            if (viva_period_id) where.viva_period_id = parseInt(viva_period_id);
            if (viva_schedule_id) where.viva_schedule_id = parseInt(viva_schedule_id);

            return await prisma.viva_audit_logs.findMany({
                where,
                orderBy: { created_at: "desc" },
                take: limit
            });
        } catch (error) {
            console.error("VivaAuditService getLogs Error:", error.message);
            return [];
        }
    }
}

module.exports = VivaAuditService;
