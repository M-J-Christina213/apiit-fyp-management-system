const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await prisma.notifications.findMany({
            where: {
                user_id: Number(userId)
            },
            orderBy: {
                created_at: "desc"
            }
        });
        res.json(notifications);
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.notifications.update({
            where: {
                id: Number(id)
            },
            data: {
                is_read: true
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        res.status(500).json({ message: "Failed to update notification" });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await prisma.notifications.updateMany({
            where: {
                user_id: Number(userId),
                is_read: false
            },
            data: {
                is_read: true
            }
        });
        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        res.status(500).json({ message: "Failed to update notifications" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.notifications.delete({
            where: {
                id: Number(id)
            }
        });
        res.json({ success: true, message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Failed to delete notification:", error);
        res.status(500).json({ message: "Failed to delete notification" });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
