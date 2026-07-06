const express = require("express");
const router = express.Router();

const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

router.get("/:userId", getNotifications);
router.put("/read/:id", markAsRead);
router.put("/read-all/:userId", markAllAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
